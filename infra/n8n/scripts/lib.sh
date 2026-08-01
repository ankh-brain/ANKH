#!/usr/bin/env bash
# Shared helpers for the n8n ops scripts. Sourced, not executed.

set -euo pipefail

STACK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly STACK_DIR

# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------
if [ -t 1 ]; then
  C_RED=$'\033[31m'; C_YELLOW=$'\033[33m'; C_GREEN=$'\033[32m'
  C_BOLD=$'\033[1m'; C_OFF=$'\033[0m'
else
  C_RED=''; C_YELLOW=''; C_GREEN=''; C_BOLD=''; C_OFF=''
fi

# Print a script's leading comment block as its --help text. Stops at the
# first blank or non-comment line, so it never spills into the code.
print_header_doc() {
  awk '
    NR == 1 && /^#!/       { next }
    /^#[[:space:]]*shellcheck/ { exit }
    /^#/                   { sub(/^#[[:space:]]?/, ""); print; next }
                           { exit }
  ' "$1"
}

log()  { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
ok()   { printf '%s  %s%s%s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$C_GREEN" "$*" "$C_OFF"; }
warn() { printf '%s  %s%s%s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$C_YELLOW" "$*" "$C_OFF" >&2; }
die()  { printf '%s  %s%s%s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$C_RED" "ERROR: $*" "$C_OFF" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------

# Resolve `docker compose` (v2 plugin) or `docker-compose` (v1 binary).
detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
  else
    die "neither 'docker compose' nor 'docker-compose' is available"
  fi
}

# Load .env without executing it as a script. Variables already present in the
# environment win, so `N8N_VOLUME_NAME=scratch ./scripts/restore.sh ...` does
# what it looks like it does.
load_env() {
  local env_file="$STACK_DIR/.env" line key value
  [ -f "$env_file" ] || die "$env_file not found. Copy .env.example to .env and fill it in."

  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"
    case "$line" in ''|'#'*) continue ;; esac
    case "$line" in *=*) ;; *) continue ;; esac
    key="${line%%=*}"
    key="${key#export }"
    key="${key// /}"
    [ -n "${!key:-}" ] && continue          # already set in the environment
    value="${line#*=}"
    # strip one layer of matching quotes
    case "$value" in
      \"*\") value="${value%\"}"; value="${value#\"}" ;;
      \'*\') value="${value%\'}"; value="${value#\'}" ;;
    esac
    export "$key=$value"
  done < "$env_file"

  [ -n "${N8N_ENCRYPTION_KEY:-}" ] || die "N8N_ENCRYPTION_KEY is empty in .env"
  [ -n "${N8N_IMAGE_TAG:-}" ] || die "N8N_IMAGE_TAG is empty in .env"

  VOLUME_NAME="${N8N_VOLUME_NAME:-n8n_data}"
  IMAGE="docker.n8n.io/n8nio/n8n:${N8N_IMAGE_TAG}"
}

preflight() {
  command -v docker >/dev/null 2>&1 || die "docker is not installed or not on PATH"
  docker info >/dev/null 2>&1 || die "cannot talk to the docker daemon (are you in the docker group?)"
  detect_compose
  load_env
  cd "$STACK_DIR"
}

# ---------------------------------------------------------------------------
# Container helpers
# ---------------------------------------------------------------------------

container_id() { "${COMPOSE[@]}" ps -q n8n 2>/dev/null || true; }

is_running() {
  local cid
  cid="$(container_id)"
  [ -n "$cid" ] && [ "$(docker inspect -f '{{.State.Running}}' "$cid" 2>/dev/null)" = "true" ]
}

require_running() {
  is_running || die "the n8n container is not running. Start it with: ${COMPOSE[*]} up -d"
}

# Run the n8n CLI inside the container as the node user.
n8n_cli() { "${COMPOSE[@]}" exec -T -u node n8n n8n "$@"; }

# Block until /healthz answers, or give up.
wait_healthy() {
  local timeout="${1:-120}" waited=0 cid
  log "waiting for n8n to come up (up to ${timeout}s)..."
  while [ "$waited" -lt "$timeout" ]; do
    cid="$(container_id)"
    if [ -n "$cid" ] && docker exec "$cid" wget -q --spider http://127.0.0.1:5678/healthz 2>/dev/null; then
      ok "n8n is healthy"
      return 0
    fi
    sleep 3
    waited=$((waited + 3))
  done
  return 1
}

# ---------------------------------------------------------------------------
# Cleanup stack
# ---------------------------------------------------------------------------
# One EXIT trap, many hooks, run last-registered-first — so a script that
# stopped n8n restarts it before the lock is released.
_CLEANUP_HOOKS=()
add_cleanup() { _CLEANUP_HOOKS+=("$1"); }
_run_cleanup() {
  local i
  for (( i=${#_CLEANUP_HOOKS[@]}-1 ; i>=0 ; i-- )); do
    eval "${_CLEANUP_HOOKS[$i]}" || true
  done
}
trap _run_cleanup EXIT

# Guard against two scripts touching the stack at once (nightly cron vs a
# manual update). Uses a directory, which is atomic on every filesystem.
acquire_lock() {
  LOCK_DIR="$STACK_DIR/.opslock"
  # update.sh calls backup.sh; the child inherits the flag and does not
  # deadlock on a lock its own parent is holding.
  if [ "${N8N_OPS_LOCK_HELD:-0}" = "1" ]; then
    return 0
  fi
  if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    die "another n8n ops script is running (lock: $LOCK_DIR). Remove it if that is stale."
  fi
  export N8N_OPS_LOCK_HELD=1
  add_cleanup "rmdir '$LOCK_DIR' 2>/dev/null || true"
}
