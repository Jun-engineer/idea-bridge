#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: apply-local.sh [options] [-- <extra terraform args>]

Automates packaging the backend Lambda bundle and running Terraform plan/apply.

Options:
  --plan-only       Run terraform plan but skip terraform apply.
  --skip-build      Skip rebuilding the backend Lambda package (uses existing ZIP).
  --reconfigure     Pass -reconfigure to terraform init.
  -h, --help        Show this help message.

Environment:
  JWT_SECRET        If unset, the script prompts securely for the value.

Additional arguments after "--" are forwarded to both terraform plan and apply.
EOF
}

PLAN_ONLY=0
SKIP_BUILD=0
RECONFIGURE=0
FORWARD_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --plan-only)
      PLAN_ONLY=1
      shift
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    --reconfigure)
      RECONFIGURE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      FORWARD_ARGS=("$@")
      break
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

SCRIPT_DIR=$(cd -- "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)
REPO_ROOT=$(cd -- "$SCRIPT_DIR/../.." >/dev/null 2>&1 && pwd)
BACKEND_DIR="$REPO_ROOT/backend"
TERRAFORM_DIR="$SCRIPT_DIR"

declare -a REQUIRED_CMDS=(npm terraform zip)
for cmd in "${REQUIRED_CMDS[@]}"; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: required command '$cmd' not found in PATH" >&2
    exit 1
  fi
done

if (( SKIP_BUILD == 0 )); then
  echo "==> Building backend Lambda package"
  pushd "$BACKEND_DIR" >/dev/null
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
  npm run build
  npm prune --omit=dev
  rm -f idea-bridge-backend.zip
  zip -qr idea-bridge-backend.zip dist node_modules package.json package-lock.json
  popd >/dev/null
else
  echo "==> Skipping backend build (using existing ZIP)"
fi

JWT_SECRET_VALUE=${JWT_SECRET:-}
if [[ -z "$JWT_SECRET_VALUE" ]]; then
  read -rsp "Enter JWT secret: " JWT_SECRET_VALUE
  echo
fi

pushd "$TERRAFORM_DIR" >/dev/null
trap 'rm -f tfplan' EXIT

INIT_ARGS=(-input=false)
if (( RECONFIGURE == 1 )); then
  INIT_ARGS+=(-reconfigure)
fi

echo "==> terraform init"
terraform init "${INIT_ARGS[@]}"

PLAN_ARGS=(-input=false -var="jwt_secret=${JWT_SECRET_VALUE}")
if ((${#FORWARD_ARGS[@]} > 0)); then
  PLAN_ARGS+=("${FORWARD_ARGS[@]}")
fi
PLAN_ARGS+=(-out=tfplan)

echo "==> terraform plan"
terraform plan "${PLAN_ARGS[@]}"

if (( PLAN_ONLY == 0 )); then
  echo "==> terraform apply"
  if ((${#FORWARD_ARGS[@]} > 0)); then
    terraform apply -input=false "${FORWARD_ARGS[@]}" tfplan
  else
    terraform apply -input=false tfplan
  fi
else
  echo "Skipped terraform apply (plan-only mode)."
fi

popd >/dev/null
