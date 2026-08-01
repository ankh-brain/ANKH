#!/usr/bin/env bash
#
# Nightly n8n backup.
#
#   backups/YYYY-MM-DD/
#     workflows/*.json          one file per workflow (n8n export:workflow)
#     credentials/*.json        one file per credential, ENCRYPTED
#     credentials.decrypted.json  only if BACKUP_DECRYPT_CREDENTIALS=1
#     n8n-data.tar.gz           full copy of the /home/node/.n8n volume
#     MANIFEST.txt              versions, sizes, sha256 of every file
#
# Two independent restore paths, on purpose:
#   - the tarball restores the whole instance byte for byte (fastest, and the
#     one the restore drill in the README uses);
#   - the JSON exports are portable, diffable, and readable by a future n8n
#     that will not mount today's SQLite file.
#
# n8n is stopped for the few seconds it takes to tar the volume. Copying a
# live SQLite database is how you get a backup that only looks fine.
#
# Usage:  ./scripts/backup.sh
# Cron:   see README, "Nightly backups".

# shellcheck source=lib.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

case "${1:-}" in
  -h|--help) print_header_doc "$0"; exit 0 ;;
  "") ;;
  *) die "backup.sh takes no arguments (got '$1')" ;;
esac

preflight
acquire_lock

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
case "$RETENTION_DAYS" in
  ''|*[!0-9]*) die "BACKUP_RETENTION_DAYS must be a whole number, got '$RETENTION_DAYS'" ;;
esac
[ "$RETENTION_DAYS" -ge 1 ] || die "BACKUP_RETENTION_DAYS must be at least 1"

BACKUP_ROOT="$STACK_DIR/backups"
STAMP="$(date '+%Y-%m-%d')"
DEST="$BACKUP_ROOT/$STAMP"
# Build somewhere else and move into place at the end, so a failed run never
# leaves a half-written directory that looks like a good backup.
WORK="$BACKUP_ROOT/.incomplete-$STAMP-$$"
CONTAINER_TMP="/home/node/.n8n/_backup_tmp"

mkdir -p "$BACKUP_ROOT"
chmod 700 "$BACKUP_ROOT"

# Sweep anything a previously killed run left behind.
find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '.incomplete-*' \
  -exec rm -rf {} + 2>/dev/null || true

mkdir -p "$WORK"
add_cleanup "rm -rf '$WORK'"

log "n8n backup starting → $DEST"
require_running

CID="$(container_id)"

# ---------------------------------------------------------------------------
# 1. CLI exports (instance running)
# ---------------------------------------------------------------------------
log "exporting workflows and credentials via the n8n CLI"

drop_container_tmp() {
  "${COMPOSE[@]}" exec -T -u node n8n rm -rf "$CONTAINER_TMP" >/dev/null 2>&1 || true
}
restart_n8n() {
  log "ensuring n8n is running again"
  "${COMPOSE[@]}" start n8n >/dev/null 2>&1 || true
}

drop_container_tmp
"${COMPOSE[@]}" exec -T -u node n8n mkdir -p "$CONTAINER_TMP/workflows" "$CONTAINER_TMP/credentials"
add_cleanup drop_container_tmp

# --backup == --all --pretty --separate
n8n_cli export:workflow --backup --output="$CONTAINER_TMP/workflows/"
n8n_cli export:credentials --backup --output="$CONTAINER_TMP/credentials/"

if [ "${BACKUP_DECRYPT_CREDENTIALS:-0}" = "1" ]; then
  warn "BACKUP_DECRYPT_CREDENTIALS=1 — writing credentials in PLAINTEXT."
  warn "Anyone who can read $DEST can use every API key you own."
  n8n_cli export:credentials --all --decrypted \
    --output="$CONTAINER_TMP/credentials.decrypted.json"
fi

docker cp "$CID:$CONTAINER_TMP/." "$WORK/"
drop_container_tmp

# `|| true` inside the braces: pipefail would otherwise turn a missing
# directory into a failed assignment and abort the whole backup.
WF_COUNT="$( { find "$WORK/workflows" -name '*.json' -type f 2>/dev/null || true; } | wc -l | tr -d ' ')"
CRED_COUNT="$( { find "$WORK/credentials" -name '*.json' -type f 2>/dev/null || true; } | wc -l | tr -d ' ')"
log "exported $WF_COUNT workflow(s), $CRED_COUNT credential(s)"

if [ "$WF_COUNT" -eq 0 ]; then
  warn "no workflows exported — fine on a brand new instance, suspicious otherwise"
fi

# ---------------------------------------------------------------------------
# 2. Volume snapshot (instance stopped)
# ---------------------------------------------------------------------------
N8N_VERSION="$(docker exec "$CID" n8n --version 2>/dev/null | tr -d '\r' || echo unknown)"
IMAGE_DIGEST="$(docker inspect -f '{{index .RepoDigests 0}}' "$IMAGE" 2>/dev/null || echo unknown)"

log "stopping n8n for a consistent copy of the SQLite database"
"${COMPOSE[@]}" stop n8n >/dev/null
# If anything below explodes, bring n8n back before unwinding further.
add_cleanup restart_n8n

log "archiving volume '$VOLUME_NAME'"
docker run --rm --user 0:0 --entrypoint sh \
  -v "$VOLUME_NAME":/data:ro \
  -v "$WORK":/out \
  "$IMAGE" -c 'tar czf /out/n8n-data.tar.gz -C /data .'

log "starting n8n"
"${COMPOSE[@]}" start n8n >/dev/null
wait_healthy 180 || warn "n8n did not report healthy within 180s — check: ${COMPOSE[*]} logs -f n8n"

# ---------------------------------------------------------------------------
# 3. Manifest
# ---------------------------------------------------------------------------
{
  echo "n8n backup"
  echo "taken:          $(date '+%Y-%m-%d %H:%M:%S %z')"
  echo "host:           $(uname -n)"
  echo "n8n version:    $N8N_VERSION"
  echo "image tag:      $N8N_IMAGE_TAG"
  echo "image digest:   $IMAGE_DIGEST"
  echo "volume:         $VOLUME_NAME"
  echo "workflows:      $WF_COUNT"
  echo "credentials:    $CRED_COUNT"
  echo "plaintext creds: ${BACKUP_DECRYPT_CREDENTIALS:-0}"
  echo
  echo "Credentials in this backup are encrypted with N8N_ENCRYPTION_KEY."
  echo "Restoring them onto an instance with a different key will NOT work."
  echo "The key is not in this directory. Keep it somewhere else, on purpose."
  echo
  echo "sha256:"
  ( cd "$WORK" && find . -type f ! -name MANIFEST.txt -print0 | sort -z | xargs -0 sha256sum )
} > "$WORK/MANIFEST.txt"

# ---------------------------------------------------------------------------
# 4. Publish and prune
# ---------------------------------------------------------------------------
rm -rf "$DEST"
mv "$WORK" "$DEST"
chmod 700 "$DEST"

SIZE="$(du -sh "$DEST" | cut -f1)"
ok "backup complete: $DEST ($SIZE)"

# Keep the newest N dated directories. Sorting by name is sorting by date.
mapfile -t ALL < <(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d \
  -regex '.*/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]$' | sort)

if [ "${#ALL[@]}" -gt "$RETENTION_DAYS" ]; then
  PRUNE=$(( ${#ALL[@]} - RETENTION_DAYS ))
  for (( i=0; i<PRUNE; i++ )); do
    log "pruning old backup: $(basename "${ALL[$i]}")"
    rm -rf "${ALL[$i]}"
  done
fi

# restore.sh leaves a safety snapshot behind every time it runs. Age those
# out on the same schedule so they don't quietly fill the disk.
while IFS= read -r stale; do
  [ -n "$stale" ] || continue
  log "pruning old pre-restore snapshot: $(basename "$stale")"
  rm -f "$stale"
done < <(find "$BACKUP_ROOT" -maxdepth 1 -type f -name '.pre-restore-*.tar.gz' \
           -mtime "+$RETENTION_DAYS" 2>/dev/null || true)

KEPT="$( { find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d \
  -regex '.*/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]$' 2>/dev/null || true; } | wc -l | tr -d ' ')"
log "retained $KEPT daily backup(s), keeping $RETENTION_DAYS"
