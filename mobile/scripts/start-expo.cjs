#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const { spawn, spawnSync } = require("node:child_process");

const DEFAULT_PORT = 8081;
const DEFAULT_API_PORT = Number(process.env.EXPO_PUBLIC_API_PORT ?? 4000);
const IS_WSL = Boolean(process.env.WSL_DISTRO_NAME);
const WINDOWS_NETSH_PATH = "/mnt/c/Windows/System32/netsh.exe";

function isPrivateIPv4(ip) {
  if (!ip) {
    return false;
  }

  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  if (parts[0] === 10) {
    return true;
  }

  if (parts[0] === 192 && parts[1] === 168) {
    return true;
  }

  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
    return true;
  }

  return false;
}

function selectPreferredIp(addresses) {
  const privateAddresses = (addresses || [])
    .map((address) => address && address.trim())
    .filter(Boolean)
    .filter(isPrivateIPv4);

  if (!privateAddresses.length) {
    return null;
  }

  const prefer192 = privateAddresses.find((ip) => ip.startsWith("192.168."));
  if (prefer192) {
    return prefer192;
  }

  const prefer10 = privateAddresses.find((ip) => ip.startsWith("10."));
  if (prefer10) {
    return prefer10;
  }

  return privateAddresses[0];
}

function detectWindowsLanIp() {
  const ipconfigPath = "/mnt/c/Windows/System32/ipconfig.exe";
  if (!fs.existsSync(ipconfigPath)) {
    return null;
  }

  const result = spawnSync(ipconfigPath, [], { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    return null;
  }

  const matches = Array.from(result.stdout.matchAll(/IPv4[^:\r\n]*:\s*([0-9.]+)/gi)).map((match) => match[1]);
  return selectPreferredIp(matches);
}

function detectWslIp() {
  const interfaces = os.networkInterfaces();
  const eth0 = interfaces.eth0 || interfaces.ens33 || interfaces.eth1;

  if (eth0) {
    const primary = eth0.find((detail) => detail.family === "IPv4" && !detail.internal);
    if (primary) {
      return primary.address;
    }
  }

  const discovered = [];
  for (const details of Object.values(interfaces)) {
    for (const detail of details || []) {
      if (detail.family === "IPv4" && !detail.internal) {
        discovered.push(detail.address);
      }
    }
  }

  return selectPreferredIp(discovered);
}

function ensureWindowsPortProxy(port) {
  if (!IS_WSL) {
    return;
  }

  if (!fs.existsSync(WINDOWS_NETSH_PATH)) {
    return;
  }

  const wslIp = detectWslIp();
  if (!wslIp) {
    console.warn("[mobile] Unable to detect WSL IP address. LAN devices may not reach the Expo bundler.");
    return;
  }

  const showResult = spawnSync(
    WINDOWS_NETSH_PATH,
    ["interface", "portproxy", "show", "v4tov4"],
    { encoding: "utf8" }
  );

  if (showResult.status === 0 && showResult.stdout) {
    const lines = showResult.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const existing = lines
      .map((line) => line.split(/\s+/))
      .find((parts) => parts.length >= 4 && parts[0] === "0.0.0.0" && parts[1] === String(port));

    if (existing && existing[2] === wslIp && existing[3] === String(port)) {
      console.log(`[mobile] Windows portproxy already listening on 0.0.0.0:${port} -> ${wslIp}:${port}.`);
      return;
    }
  }

  const deleteResult = spawnSync(
    WINDOWS_NETSH_PATH,
    ["interface", "portproxy", "delete", "v4tov4", "listenaddress=0.0.0.0", `listenport=${port}`],
    { encoding: "utf8" }
  );

  if (deleteResult.status !== 0 && (deleteResult.stderr || deleteResult.stdout)) {
    const output = (deleteResult.stderr || deleteResult.stdout || "").trim();
    if (output && !/(指定された(エントリ|ファイル)が見つかりません|No items|cannot find the file)/i.test(output)) {
      console.warn(`[mobile] netsh delete warning: ${output}`);
    }
  }

  const addResult = spawnSync(
    WINDOWS_NETSH_PATH,
    [
      "interface",
      "portproxy",
      "add",
      "v4tov4",
      "listenaddress=0.0.0.0",
      `listenport=${port}`,
      `connectaddress=${wslIp}`,
      `connectport=${port}`,
    ],
    { encoding: "utf8" }
  );

  if (addResult.status !== 0) {
    const command = `netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=${port} connectaddress=${wslIp} connectport=${port}`;
    console.warn("[mobile] Failed to configure Windows portproxy for Expo LAN mode. Run the following command in an elevated PowerShell window:");
    console.warn(`    ${command}`);
    const output = (addResult.stderr || addResult.stdout || "").trim();
    if (output) {
      console.warn(`[mobile] netsh output: ${output}`);
    }
    return;
  }

  console.log(`[mobile] Windows portproxy listening on 0.0.0.0:${port} -> ${wslIp}:${port}.`);
}

function normalizeUrlForParsing(value) {
  if (!value) {
    return null;
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    return value;
  }

  return `http://${value}`;
}

function isLocalHostCandidate(host) {
  if (!host) {
    return false;
  }

  const lowered = host.toLowerCase();
  if (lowered === "localhost" || lowered === "::1" || lowered === "[::1]") {
    return true;
  }

  if (lowered.startsWith("127.")) {
    return true;
  }

  return isPrivateIPv4(host);
}

let apiPortsConfigured = false;

function ensureApiPortsProxy() {
  if (apiPortsConfigured) {
    return;
  }

  apiPortsConfigured = true;

  const raw = process.env.EXPO_PUBLIC_API_BASE_URL || "";
  const entries = raw
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const ports = new Set();

  for (const entry of entries) {
    const normalized = normalizeUrlForParsing(entry);
    if (!normalized) {
      continue;
    }

    let parsed;
    try {
      parsed = new URL(normalized);
    } catch {
      continue;
    }

    if (!isLocalHostCandidate(parsed.hostname)) {
      continue;
    }

    if (parsed.port) {
      const portNumber = Number(parsed.port);
      if (!Number.isNaN(portNumber)) {
        ports.add(portNumber);
      }
    } else if (parsed.protocol === "https:") {
      ports.add(443);
    } else {
      ports.add(DEFAULT_API_PORT);
    }
  }

  if (!ports.size) {
    ports.add(DEFAULT_API_PORT);
  }

  for (const port of ports) {
    if (typeof port === "number" && Number.isFinite(port) && port > 0) {
      ensureWindowsPortProxy(port);
    }
  }
}

function resolveLanHostname() {
  const envCandidates = [
    process.env.EXPO_LAN_HOSTNAME,
    process.env.EXPO_DEV_SERVER_HOST,
    process.env.LAN_HOST,
  ];

  for (const candidate of envCandidates) {
    if (candidate && candidate.trim()) {
      return candidate.trim();
    }
  }

  const windowsIp = detectWindowsLanIp();
  if (windowsIp) {
    return windowsIp;
  }

  const interfaces = os.networkInterfaces();
  const discovered = [];

  for (const details of Object.values(interfaces)) {
    for (const detail of details || []) {
      if (detail.family === "IPv4" && !detail.internal) {
        discovered.push(detail.address);
      }
    }
  }

  return selectPreferredIp(discovered);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function resolveRequestedPort(args) {
  let port = DEFAULT_PORT;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--port" || arg === "-p") {
      const value = args[index + 1];
      if (value && !Number.isNaN(Number(value))) {
        port = Number(value);
      }
      break;
    }

    if (arg.startsWith("--port=")) {
      const value = arg.split("=")[1];
      if (value && !Number.isNaN(Number(value))) {
        port = Number(value);
      }
      break;
    }
  }

  return port;
}

function hasHostOverride(arg) {
  return ["--localhost", "--lan", "--tunnel", "--offline", "--host"].some((flag) =>
    arg === flag || arg.startsWith("--host=")
  );
}

function buildArgs(incoming) {
  const hostOverride = incoming.some(hasHostOverride);
  const baseArgs = ["start"];

  if (!process.env.EXPO_NO_AUTO_DEV_CLIENT_UPDATES) {
    process.env.EXPO_NO_AUTO_DEV_CLIENT_UPDATES = "1";
  }

  if (!hostOverride) {
    if (!process.env.REACT_NATIVE_PACKAGER_HOSTNAME) {
      process.env.REACT_NATIVE_PACKAGER_HOSTNAME = "127.0.0.1";
    }
    baseArgs.push("--localhost");
  }

  const args = baseArgs.concat(incoming);

  if (args.includes("--lan") && !process.env.REACT_NATIVE_PACKAGER_HOSTNAME) {
    const lanHost = resolveLanHostname();

    if (lanHost) {
      process.env.REACT_NATIVE_PACKAGER_HOSTNAME = lanHost;
      console.log(`[mobile] Using LAN host ${lanHost} for Expo dev server.`);
    } else {
      console.warn(
        "[mobile] Unable to determine LAN host automatically. Set REACT_NATIVE_PACKAGER_HOSTNAME to a LAN-reachable IP so physical devices can connect."
      );
    }
  }

  const resolvedPort = resolveRequestedPort(args);

  if (args.includes("--lan")) {
    ensureWindowsPortProxy(resolvedPort);
    ensureApiPortsProxy();
  }

  return {
    args,
    port: resolvedPort,
  };
}

function readCmdline(pid) {
  try {
    return fs.readFileSync(`/proc/${pid}/cmdline`, "utf8");
  } catch {
    return "";
  }
}

function listPidsOnPort(port) {
  const result = spawnSync("lsof", ["-t", `-i:${port}`], { encoding: "utf8" });

  if (result.error) {
    console.warn(`[mobile] Unable to inspect port ${port}: ${result.error.message}`);
    return [];
  }

  const stdout = (result.stdout || "").trim();
  if (!stdout) {
    return [];
  }

  return stdout.split(/\s+/).filter(Boolean);
}

function ensurePortAvailable(port) {
  const pids = listPidsOnPort(port);
  if (!pids.length) {
    return;
  }

  const expoPids = pids.filter((pid) => {
    const cmdline = readCmdline(pid);
    return cmdline.includes("expo/bin/cli") && cmdline.includes("start");
  });

  if (!expoPids.length) {
    console.warn(`[mobile] Port ${port} is already in use by process(es): ${pids.join(", ")}. Pass --port to select a different port.`);
    process.exit(1);
  }

  console.log(`[mobile] Terminating stale Expo dev server on port ${port} (${expoPids.join(", ")}).`);

  for (const pid of expoPids) {
    try {
      process.kill(Number(pid), "SIGTERM");
    } catch (error) {
      console.warn(`[mobile] Failed to send SIGTERM to PID ${pid}: ${error.message}`);
    }
  }

  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    const remaining = listPidsOnPort(port);
    if (!remaining.length) {
      return;
    }

    for (const pid of remaining) {
      try {
        process.kill(Number(pid), "SIGKILL");
      } catch {
        // ignore
      }
    }

    sleep(100);
  }

  console.warn(`[mobile] Port ${port} is still busy after attempting to close Expo dev servers. Please retry.`);
  process.exit(1);
}

function runExpo() {
  let expoCli;
  try {
    expoCli = require.resolve("expo/bin/cli");
  } catch (error) {
    console.error("[mobile] Unable to locate Expo CLI locally. Did you run npm install?");
    process.exit(1);
  }

  const incoming = process.argv.slice(2);
  const { args, port } = buildArgs(incoming);

  ensurePortAvailable(port);

  const finalArgs = [expoCli, ...args];
  const child = spawn(process.execPath, finalArgs, {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });

  child.on("error", (error) => {
    console.error(`[mobile] Failed to launch Expo CLI: ${error.message}`);
    process.exit(1);
  });
}

runExpo();
