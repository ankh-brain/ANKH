#!/usr/bin/env bash
#
# Import the starter workflows in ./workflows into the running instance.
#
#   ./scripts/import-workflows.sh
#
# The directory is mounted read-only at /workflows inside the container.
# Each JSON file carries a stable `id`, so re-running this updates the same
# two workflows rather than creating duplicates.
#
# They import DEACTIVATED and with no credentials attached, on purpose:
# they are smoke tests you finish wiring up in the editor, not something
# that starts emailing people the moment it lands.
#
# Run this only after you have created the owner account on first boot —
# imported workflows need an owner to belong to.

# shellcheck source=lib.sh
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"

case "${1:-}" in
  -h|--help) print_header_doc "$0"; exit 0 ;;
  "") ;;
  *) die "import-workflows.sh takes no arguments (got '$1')" ;;
esac

preflight
acquire_lock
require_running

COUNT="$( { find "$STACK_DIR/workflows" -maxdepth 1 -name '*.json' -type f 2>/dev/null || true; } | wc -l | tr -d ' ')"
[ "$COUNT" -gt 0 ] || die "no .json files in $STACK_DIR/workflows"

log "importing $COUNT workflow file(s) from ./workflows"

if ! n8n_cli import:workflow --separate --input=/workflows; then
  echo
  warn "import failed."
  echo "  Most likely cause: no owner account exists yet. Open"
  echo "  https://${N8N_HOST}/setup and create it, then run this again."
  echo
  echo "  If the error mentions a project, list projects and retry with one:"
  echo "    ${COMPOSE[*]} exec -u node n8n n8n import:workflow --separate \\"
  echo "      --input=/workflows --projectId=<id>"
  exit 1
fi

echo
ok "imported."
echo
echo "Both workflows are INACTIVE. To finish them off in the editor at"
echo "https://${N8N_HOST} :"
echo
echo "  ${C_BOLD}Starter — RSS to email digest${C_OFF}"
echo "    1. 'Send digest email': attach an SMTP credential, set the real"
echo "       from/to addresses."
echo "    2. 'Read RSS feed': point it at a feed you actually read."
echo "    3. Hit 'Execute workflow' once. An email should arrive."
echo "    4. Activate it. It runs daily at 07:00 in ${GENERIC_TIMEZONE:-Etc/UTC}."
echo
echo "  ${C_BOLD}Starter — webhook to Telegram alert${C_OFF}"
echo "    1. 'Send Telegram alert': attach a Telegram bot credential and set"
echo "       your chat id (message @userinfobot to find it)."
echo "    2. 'Verify token and format': replace the placeholder shared secret."
echo "    3. Activate it, then prove the public path works end to end:"
echo
echo "         curl -X POST https://${N8N_HOST}/webhook/alert \\"
echo "           -H 'Content-Type: application/json' \\"
echo "           -H 'X-Alert-Token: <the secret you just set>' \\"
echo "           -d '{\"level\":\"error\",\"source\":\"curl\",\"message\":\"hello from outside\"}'"
echo
echo "    A Telegram message means TLS, the reverse proxy, WEBHOOK_URL and"
echo "    n8n are all agreeing with each other. That is the real smoke test."
