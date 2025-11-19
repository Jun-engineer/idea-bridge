#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

const ports = [8081, 8082, 8083, 19000, 19001, 19002];
const EXPO_PACKAGE = "host.exp.exponent";
const adbCommand = process.env.ADB_PATH || "adb";

function runAdb(args) {
  const result = spawnSync(adbCommand, args, {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  if (result.error) {
    if (result.error.code === "ENOENT") {
      console.warn(
        "[mobile] adb executable not found. Install Android platform-tools or point ADB_PATH to your adb binary (e.g. /mnt/c/Users/<you>/AppData/Local/Android/Sdk/platform-tools/adb.exe)."
      );
      return { ok: false, stdout: "", stderr: "adb not found" };
    }
    console.warn(`[mobile] adb command failed: ${result.error.message}`);
    return { ok: false, stdout: "", stderr: result.error.message };
  }

  const stderr = result.stderr ? result.stderr.toString().trim() : "";
  const stdout = result.stdout ? result.stdout.toString() : "";
  if (result.status !== 0) {
    return { ok: false, stdout, stderr };
  }

  return { ok: true, stdout, stderr };
}

function ensureReverse(serial, port) {
  const args = serial ? ["-s", serial, "reverse", `tcp:${port}`, `tcp:${port}`] : [
    "reverse",
    `tcp:${port}`,
    `tcp:${port}`,
  ];
  const { ok, stderr } = runAdb(args);
  if (!ok) {
    if (/no devices/i.test(stderr)) {
      console.warn(
        `[mobile] adb reverse tcp:${port} skipped: no emulator/device connected yet. Start the Android emulator first.`
      );
      return false;
    }
    if (stderr && !/already exists/i.test(stderr)) {
      console.warn(
        `[mobile] adb reverse tcp:${port} failed${serial ? ` for ${serial}` : ""}: ${stderr}`
      );
    }
    return false;
  }
  console.log(
    `[mobile] adb reverse tcp:${port} -> tcp:${port} established${serial ? ` for ${serial}` : ""}.`
  );
  return true;
}

function shouldClearExpoCache() {
  const flag = process.env.EXPO_PRESERVE_EXPO_GO_CACHE;
  if (!flag) {
    return true;
  }

  return !(flag === "1" || flag.toLowerCase() === "true");
}

function clearExpoGo(serial) {
  if (!shouldClearExpoCache()) {
    return;
  }

  const args = serial
    ? ["-s", serial, "shell", "pm", "clear", EXPO_PACKAGE]
    : ["shell", "pm", "clear", EXPO_PACKAGE];

  const result = runAdb(args);
  if (result.ok) {
    console.log(`[mobile] Cleared Expo Go cache for ${serial ?? "default device"}.`);
    return;
  }

  const stderr = result.stderr || "";
  if (/Unknown package/i.test(stderr)) {
    console.warn("[mobile] Expo Go is not installed on the connected device; skipping cache clear.");
    return;
  }

  if (/no devices/i.test(stderr)) {
    console.warn("[mobile] Unable to clear Expo Go cache: no emulator/device connected.");
    return;
  }

  console.warn(`[mobile] Failed to clear Expo Go cache${serial ? ` for ${serial}` : ""}: ${stderr || "unknown error"}`);
}

function listDevices() {
  const result = runAdb(["devices"]);
  if (!result.ok) {
    const message = result.stderr || "unknown error";
    console.warn(`[mobile] 'adb devices' failed: ${message}`);
    return [];
  }

  const lines = result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(1);

  const devices = lines
    .map((line) => line.split("\t")[0])
    .filter((id) => id && id !== "List of devices attached" && !id.includes("offline"));

  if (devices.length === 0) {
    console.warn(
      "[mobile] No Android emulator/device detected by adb. Launch your Pixel 5 emulator in Android Studio, then rerun npm run start."
    );
  }

  return devices;
}

function main() {
  const devices = listDevices();

  if (devices.length === 0) {
    return;
  }

  for (const serial of devices) {
    ports.forEach((port) => ensureReverse(serial, port));
    clearExpoGo(serial);
  }
}

main();
