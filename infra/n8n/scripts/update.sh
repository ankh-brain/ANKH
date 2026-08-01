#!/usr/bin/env bash
#
# Update n8n to an explicit version tag.
#
#   ./scripts/update.sh 2.33.3
#   ./scripts/update.sh 2.33.3 --skip-backup    # don't. really.
#
# The order is deliberate: verify the tag exists, take a full backup, then
# pull and restart. `docker compose pull && up -d` on its own is how people
# find out that n8n ran a one-way database migration on a Sunday night.
#
# `latest`, `stable`, `next` and `nightly` are rejected. A moving tag means
# an unattended `docker compose up -d` — or a host reboot with a restart
# policy — can change your n8n version without anyone deciding to.

# shellcheck source=lib.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

NEW_TAG=""
SKIP_BACKUP=0

while [ $# -gt 0 ]; do
  case "$1" in
    --skip-backup) SKIP_BACKUP=1; shift ;;
    -h|--help) print_header_doc "$0"; exit 0 ;;
    -*) die "unknown option: $1" ;;
    *) NEW_TAG="$1"; shift ;;
  esac
done

[ -n "$NEW_TAG" ] || die "usage: $0 <version-tag>   e.g. $0 2.33.3"

case "$NEW_TAG" in
  latest|stable|next|nightly|*-nightly|dev)
    die "refusing to pin '$NEW_TAG'. Use an explicit version, e.g. 2.33.3.
       A moving tag means the next restart can silently change your n8n
       version and run database migrations you did not schedule." ;;
esac

if ! printf '%s' "$NEW_TAG" | grep -Eq '^v?[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$'; then
  die "'$NEW_TAG' does not look like a version tag (expected something like 2.33.3)"
fi

preflight
acquire_lock

OLD_TAG="$N8N_IMAGE_TAG"
NEW_IMAGE="docker.n8n.io/n8nio/n8n:$NEW_TAG"

if [ "$OLD_TAG" = "$NEW_TAG" ]; then
  ok "already pinned to $NEW_TAG — nothing to do"
  exit 0
fi

log "update: $OLD_TAG → $NEW_TAG"

# ---------------------------------------------------------------------------
# 1. Does that tag actually exist? (cheap check, no download)
# ---------------------------------------------------------------------------
log "checking $NEW_IMAGE exists in the registry"
if ! docker manifest inspect "$NEW_IMAGE" >/dev/null 2>&1; then
  die "tag '$NEW_TAG' not found at docker.n8n.io/n8nio/n8n.
       List what is published:
         curl -s 'https://hub.docker.com/v2/repositories/n8nio/n8n/tags?page_size=100&ordering=last_updated' \\
           | grep -o '\"name\":\"[0-9.]*\"'"
fi
ok "tag exists"

# ---------------------------------------------------------------------------
# 2. Back up first
# ---------------------------------------------------------------------------
if [ "$SKIP_BACKUP" -eq 1 ]; then
  warn "--skip-backup: proceeding with no fresh restore point"
else
  log "taking a backup before touching anything"
  # backup.sh sees N8N_OPS_LOCK_HELD and reuses this script's lock.
  "$STACK_DIR/scripts/backup.sh" || die "backup failed — not updating. Fix the backup first."
  ok "pre-update backup done"
fi

PRE_UPDATE_BACKUP="$STACK_DIR/backups/$(date '+%Y-%m-%d')"

# ---------------------------------------------------------------------------
# 3. Pin, pull, restart
# ---------------------------------------------------------------------------
ENV_BACKUP="$STACK_DIR/.env.bak.$(date '+%Y%m%d-%H%M%S')"
cp "$STACK_DIR/.env" "$ENV_BACKUP"
chmod 600 "$ENV_BACKUP"
log "saved .env → $(basename "$ENV_BACKUP")"

# Rewrite the pin, reading the saved copy so we never read and write the same
# file at once. Every other line, comments included, is passed through.
awk -v tag="$NEW_TAG" '
  /^[[:space:]]*N8N_IMAGE_TAG[[:space:]]*=/ { print "N8N_IMAGE_TAG=" tag; seen = 1; next }
  { print }
  END { if (!seen) print "N8N_IMAGE_TAG=" tag }
' "$ENV_BACKUP" > "$STACK_DIR/.env"

grep -q "^N8N_IMAGE_TAG=$NEW_TAG$" "$STACK_DIR/.env" \
  || die "failed to write the new tag into .env — restore it from $(basename "$ENV_BACKUP")"

rollback_env() {
  warn "rolling the .env pin back to $OLD_TAG"
  cp "$ENV_BACKUP" "$STACK_DIR/.env"
}

log "pulling $NEW_IMAGE"
if ! "${COMPOSE[@]}" pull n8n; then
  rollback_env
  die "pull failed. Nothing was changed; you are still on $OLD_TAG."
fi

log "recreating the container"
if ! "${COMPOSE[@]}" up -d; then
  rollback_env
  die "compose up failed. .env is back on $OLD_TAG — run '${COMPOSE[*]} up -d' to return to the old version."
fi

# ---------------------------------------------------------------------------
# 4. Did it actually come up?
# ---------------------------------------------------------------------------
if wait_healthy 240; then
  RUNNING_VERSION="$(docker exec "$(container_id)" n8n --version 2>/dev/null | tr -d '\r' || echo unknown)"
  echo
  ok "n8n is running $RUNNING_VERSION (tag $NEW_TAG)"
  echo
  echo "Worth two minutes now:"
  echo "  - load the editor and open one workflow"
  echo "  - check that scheduled workflows are still marked active"
  echo "  - ${COMPOSE[*]} logs --since 10m n8n | grep -i -E 'error|deprecat'"
  echo
  echo "Old image is still on disk if you need it:"
  echo "  docker image ls docker.n8n.io/n8nio/n8n"
else
  echo
  warn "n8n did not become healthy on $NEW_TAG."
  echo
  echo "  Logs:  ${COMPOSE[*]} logs --tail 200 n8n"
  echo
  echo "  ${C_BOLD}Do not just pin the old tag and restart.${C_OFF} If the new version"
  echo "  already ran database migrations, the old version cannot read the"
  echo "  migrated database and will fail differently. The correct rollback is"
  echo "  to restore the pre-update snapshot, which contains the un-migrated"
  echo "  database:"
  echo
  echo "      ./scripts/restore.sh $PRE_UPDATE_BACKUP"
  echo "      # then set N8N_IMAGE_TAG=$OLD_TAG in .env and: ${COMPOSE[*]} up -d"
  echo
  exit 1
fi
