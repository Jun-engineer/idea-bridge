#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$ROOT_DIR/.idea-bridge/pids"

stop_service() {
  local name="$1"
  local pid_file="$2"

  if [ ! -f "$pid_file" ]; then
    echo "[info] No PID file found for $name. It may not be running."
    return
  fi

  local pid
  pid="$(<"$pid_file")"
  if ! kill -0 "$pid" 2>/dev/null; then
    echo "[warn] $name process $pid is not running. Removing stale PID file."
    rm -f "$pid_file"
    return
  fi

  echo "[stop] Sending SIGTERM to $name (PID $pid)..."
  kill "$pid"

  local countdown=10
  while kill -0 "$pid" 2>/dev/null && [ $countdown -gt 0 ]; do
    sleep 1
    countdown=$((countdown - 1))
  done

  if kill -0 "$pid" 2>/dev/null; then
    echo "[force] $name did not stop gracefully, sending SIGKILL."
    kill -9 "$pid" 2>/dev/null || true
  fi

  rm -f "$pid_file"
  echo "[ok] $name stopped."
}

if [ ! -d "$PID_DIR" ]; then
  echo "[info] No running services found."
  exit 0
fi

stop_service "backend" "$PID_DIR/backend.pid"
stop_service "frontend" "$PID_DIR/frontend.pid"

# Remove pid directory if empty
rmdir "$PID_DIR" 2>/dev/null || true
