#!/usr/bin/env bash
#
# Restore an n8n instance from a backups/YYYY-MM-DD directory.
#
#   ./scripts/restore.sh backups/2026-08-01           # asks before doing it
#   ./scripts/restore.sh backups/2026-08-01 --yes     # for scripted drills
#
# This REPLACES the contents of the target volume. Before it does, it takes a
# snapshot of the current volume into backups/.pre-restore-<timestamp>.tar.gz,
# so a restore of the wrong backup is itself recoverable.
#
# To rehearse without touching production, point it at a scratch volume and
# run the drill stack on another port:
#
#   N8N_VOLUME_NAME=n8n_drill N8N_CONTAINER_NAME=n8n-drill N8N_BIND_PORT=5679 \
#     ./scripts/restore.sh backups/2026-08-01 --yes --project n8n-drill
#
# THE ENCRYPTION KEY: credentials in a backup are encrypted with the
# N8N_ENCRYPTION_KEY that was in use when the backup was taken. Restore onto
# an instance with a different key and the workflows come back but every
# credential fails to decrypt. The key is not in the backup. It is in your
# password manager. Check that first, not after.

# shellcheck source=lib.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

SRC=""
ASSUME_YES=0
PROJECT=""
DEACTIVATE=0

while [ $# -gt 0 ]; do
  case "$1" in
    --yes|-y) ASSUME_YES=1; shift ;;
    --project) PROJECT="${2:?--project needs a name}"; shift 2 ;;
    --deactivate-all) DEACTIVATE=1; shift ;;
    -h|--help) print_header_doc "$0"; exit 0 ;;
    -*) die "unknown option: $1" ;;
    *) [ -n "$SRC" ] && die "only one backup directory can be restored at a time"; SRC="$1"; shift ;;
  esac
done

[ -n "$SRC" ] || die "usage: $0 backups/YYYY-MM-DD [--yes] [--project NAME] [--deactivate-all]"

preflight
acquire_lock

if [ -n "$PROJECT" ]; then COMPOSE+=(-p "$PROJECT"); fi

# Resolve relative to the stack dir, and to the caller's cwd, whichever hits.
if [ ! -d "$SRC" ] && [ -d "$STACK_DIR/$SRC" ]; then SRC="$STACK_DIR/$SRC"; fi
[ -d "$SRC" ] || die "no such backup directory: $SRC"
SRC="$(cd "$SRC" && pwd)"

ARCHIVE="$SRC/n8n-data.tar.gz"
[ -f "$ARCHIVE" ] || die "$ARCHIVE not found — is that a backup directory?"

# ---------------------------------------------------------------------------
# 1. Verify before touching anything
# ---------------------------------------------------------------------------
if [ -f "$SRC/MANIFEST.txt" ]; then
  log "verifying checksums"
  if ( cd "$SRC" && sed -n '/^sha256:$/,$p' MANIFEST.txt | tail -n +2 | sha256sum -c --quiet - ); then
    ok "checksums match"
  else
    die "checksum mismatch in $SRC — this backup is damaged, do not restore it"
  fi
else
  warn "no MANIFEST.txt — cannot verify integrity, continuing anyway"
fi

log "archive contents look like:"
tar tzf "$ARCHIVE" | head -n 8 | sed 's/^/    /'
tar tzf "$ARCHIVE" | grep -q 'database.sqlite' \
  || warn "no database.sqlite in the archive — that is unusual"

echo
printf '%s\n' "${C_BOLD}About to restore:${C_OFF}"
printf '  from volume snapshot : %s\n' "$ARCHIVE"
printf '  into docker volume   : %s\n' "$VOLUME_NAME"
printf '  compose project      : %s\n' "${PROJECT:-<default>}"
echo
if [ -f "$SRC/MANIFEST.txt" ]; then
  sed -n '1,12p' "$SRC/MANIFEST.txt" | sed 's/^/  /'
  echo
fi
warn "everything currently in volume '$VOLUME_NAME' will be replaced."

if [ "$ASSUME_YES" -ne 1 ]; then
  printf 'Type %srestore%s to continue: ' "$C_BOLD" "$C_OFF"
  read -r answer
  [ "$answer" = "restore" ] || die "aborted"
fi

# ---------------------------------------------------------------------------
# 2. Snapshot what is there now
# ---------------------------------------------------------------------------
if docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
  SAFETY="$STACK_DIR/backups/.pre-restore-$(date '+%Y%m%d-%H%M%S').tar.gz"
  mkdir -p "$STACK_DIR/backups"
  log "snapshotting the current volume first → $(basename "$SAFETY")"
  "${COMPOSE[@]}" stop n8n >/dev/null 2>&1 || true
  docker run --rm --user 0:0 --entrypoint sh \
    -v "$VOLUME_NAME":/data:ro -v "$STACK_DIR/backups":/out \
    "$IMAGE" -c "tar czf /out/$(basename "$SAFETY") -C /data ." 2>/dev/null \
    || warn "could not snapshot the current volume (probably empty) — continuing"
else
  log "volume '$VOLUME_NAME' does not exist yet; it will be created"
fi

# ---------------------------------------------------------------------------
# 3. Replace
# ---------------------------------------------------------------------------
log "stopping the stack"
"${COMPOSE[@]}" down >/dev/null 2>&1 || true

docker volume create "$VOLUME_NAME" >/dev/null

log "wiping and repopulating volume '$VOLUME_NAME'"
docker run --rm --user 0:0 --entrypoint sh \
  -v "$VOLUME_NAME":/data \
  -v "$SRC":/in:ro \
  "$IMAGE" -c '
    set -e
    find /data -mindepth 1 -maxdepth 1 -exec rm -rf {} +
    tar xzf /in/n8n-data.tar.gz -C /data
    chown -R 1000:1000 /data
    chmod 700 /data
  '

log "starting the stack"
"${COMPOSE[@]}" up -d >/dev/null

if wait_healthy 180; then
  if [ "$DEACTIVATE" -eq 1 ]; then
    # A restored instance comes back with its workflows still marked active,
    # and n8n re-arms every schedule trigger at boot. Two instances holding
    # the same active workflows means two of every email. Stand them down.
    log "deactivating all workflows on the restored instance"
    n8n_cli update:workflow --all --active=false || \
      warn "could not deactivate workflows — check them by hand before leaving this running"
    "${COMPOSE[@]}" restart n8n >/dev/null
    wait_healthy 180 || warn "n8n slow to return after restart"
    warn "workflows on this instance are now INACTIVE. Do not use --deactivate-all"
    warn "when restoring the instance you actually intend to keep running."
  fi

  echo
  ok "restore complete."
  echo
  echo "Now check, in this order:"
  echo "  1. log in as the owner account from the restored instance"
  echo "  2. open a workflow that uses a credential and hit 'Test step'"
  echo "     — if it fails to decrypt, the encryption key does not match"
  echo "  3. confirm the workflows you expected are present and their"
  echo "     active/inactive state is what you left it as"
else
  die "n8n did not come up. Logs: ${COMPOSE[*]} logs -f n8n"
fi
