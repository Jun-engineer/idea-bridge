#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$ROOT_DIR/mobile"
PID_DIR="$ROOT_DIR/.idea-bridge/pids"
LOG_DIR="$ROOT_DIR/.idea-bridge/logs"
PID_FILE="$PID_DIR/mobile.pid"
LOG_FILE="$LOG_DIR/mobile.log"

usage() {
  cat <<'EOM'
Usage: ./mobile.sh <command> [expo-args...]

Commands:
  start [expo args]   Start the Expo development server in the background.
                      Extra arguments (e.g. --tunnel) are passed to `npm run start`.
  stop                Stop the running Expo development server.
  status              Check whether the Expo development server is running.
  restart [args]      Restart the server with optional Expo arguments.
  help                Show this message.
EOM
}

ensure_directories() {
  mkdir -p "$PID_DIR" "$LOG_DIR"
}

ensure_dependencies() {
  if [ ! -d "$PROJECT_DIR/node_modules" ]; then
    echo "[setup] Installing dependencies for mobile app..."
    pushd "$PROJECT_DIR" >/dev/null
    npm install
    popd >/dev/null
  fi
}

is_running() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid="$(<"$PID_FILE")"
    if kill -0 "$pid" 2>/dev/null; then
      echo "$pid"
      return 0
    fi
    rm -f "$PID_FILE"
  fi
  return 1
}

start_mobile() {
  ensure_directories

  if pid=$(is_running); then
    echo "[skip] Mobile app already running (PID $pid)."
    exit 0
  fi

  ensure_dependencies

  echo "[start] Launching mobile Expo server..."
  pushd "$PROJECT_DIR" >/dev/null
  local expo_args=("$@")

  nohup npm run start -- "${expo_args[@]}" >>"$LOG_FILE" 2>&1 &
  local pid=$!
  popd >/dev/null

  echo "$pid" >"$PID_FILE"
  echo "[ok] Mobile app started (PID $pid). Logs: $LOG_FILE"
}

stop_mobile() {
  if ! pid=$(is_running); then
    echo "[info] Mobile app is not running."
    exit 0
  fi

  echo "[stop] Sending SIGTERM to mobile app (PID $pid)..."
  kill "$pid"

  local countdown=10
  while kill -0 "$pid" 2>/dev/null && [ $countdown -gt 0 ]; do
    sleep 1
    countdown=$((countdown - 1))
  done

  if kill -0 "$pid" 2>/dev/null; then
    echo "[force] Mobile app did not stop gracefully, sending SIGKILL."
    kill -9 "$pid" 2>/dev/null || true
  fi

  rm -f "$PID_FILE"
  echo "[ok] Mobile app stopped."
}

status_mobile() {
  if pid=$(is_running); then
    echo "[ok] Mobile app running (PID $pid)."
  else
    echo "[info] Mobile app is not running."
  fi
}

restart_mobile() {
  stop_mobile || true
  start_mobile "$@"
}

main() {
  if [ $# -lt 1 ]; then
    usage
    exit 1
  fi

  local command="$1"
  shift || true

  case "$command" in
    start)
      start_mobile "$@"
      ;;
    stop)
      stop_mobile
      ;;
    status)
      status_mobile
      ;;
    restart)
      restart_mobile "$@"
      ;;
    help|-h|--help)
      usage
      ;;
    *)
      echo "[error] Unknown command: $command" >&2
      usage
      exit 1
      ;;
  esac
}

main "$@"
