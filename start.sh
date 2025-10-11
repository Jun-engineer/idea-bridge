#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$ROOT_DIR/.idea-bridge/pids"
LOG_DIR="$ROOT_DIR/.idea-bridge/logs"

BACKEND_PID_FILE="$PID_DIR/backend.pid"
FRONTEND_PID_FILE="$PID_DIR/frontend.pid"

mkdir -p "$PID_DIR" "$LOG_DIR"

ensure_node_modules() {
  local service_dir="$1"
  local service_name="$2"

  if [ ! -d "$service_dir/node_modules" ]; then
    echo "[setup] Installing dependencies for $service_name..."
    pushd "$service_dir" >/dev/null
    npm install
    popd >/dev/null
  fi
}

service_running() {
  local pid_file="$1"
  if [ -f "$pid_file" ]; then
    local pid
    pid="$(<"$pid_file")"
    if kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
    rm -f "$pid_file"
  fi
  return 1
}

start_service() {
  local name="$1"
  local directory="$2"
  local script="$3"
  local pid_file="$4"
  local log_file="$5"

  if service_running "$pid_file"; then
    local pid
    pid="$(<"$pid_file")"
    echo "[skip] $name already running (PID $pid)."
    return
  fi

  ensure_node_modules "$directory" "$name"

  echo "[start] Launching $name..."
  pushd "$directory" >/dev/null
  nohup npm run "$script" >>"$log_file" 2>&1 &
  local pid=$!
  popd >/dev/null

  echo "$pid" >"$pid_file"
  echo "[ok] $name started (PID $pid). Logs: $log_file"
}

start_service "backend" "$ROOT_DIR/backend" "dev" "$BACKEND_PID_FILE" "$LOG_DIR/backend.log"
start_service "frontend" "$ROOT_DIR/frontend" "dev" "$FRONTEND_PID_FILE" "$LOG_DIR/frontend.log"

cat <<'EOM'

Services are running in the background.
Use ./stop.sh to stop them safely.
Tail logs with:
  tail -f .idea-bridge/logs/backend.log
  tail -f .idea-bridge/logs/frontend.log
EOM
