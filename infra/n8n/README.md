# Self-hosted n8n

n8n on your own VPS, replacing the n8n Cloud subscription. This is not a
rebuild of anything — n8n is open source and the official image is what runs
here. What this directory adds is the part the subscription was actually
selling you: someone remembering to take backups, pin versions, and be able
to put it back after it breaks.

One person's automation box. SQLite, one container, one hostname.

**Out of scope, deliberately:** multi-user teams, role-based access, queue
mode, worker scaling, Postgres, high availability. If you ever need those,
the migration path is a Postgres `DB_TYPE` swap and more compose services —
but don't pay that complexity now for a load you don't have.

---

## ⚠️ The encryption key, before anything else

n8n encrypts every stored credential — API keys, SMTP passwords, OAuth
tokens — with `N8N_ENCRYPTION_KEY`. The key is **not** in the database and
**not** in your backups.

> **If you lose the key, every saved credential is permanently unreadable.**
> Not "hard to recover". Gone. Restoring a database backup gives you back
> your workflows with every credential inside them dead, and you re-enter all
> of them by hand from the original sources — every API console, every OAuth
> consent screen, every SMTP password you no longer remember.

So: generate it once, and put a copy somewhere that is **not this server**.

```bash
openssl rand -base64 32
```

Paste it into `.env` as `N8N_ENCRYPTION_KEY`, and paste it into your password
manager as a separate entry. A backup of the VPS is not a copy of the key —
if the VPS is what died, you need the key from somewhere else to read the
backup you saved.

Changing the value later does not re-encrypt anything. n8n will simply stop
being able to decrypt what it already stored. Set it once, leave it alone.

---

## Layout

```
infra/n8n/
├── docker-compose.yml          official n8n image, SQLite, 127.0.0.1 only
├── .env.example                copy to .env — key, hostname, version pin
├── scripts/
│   ├── lib.sh                  shared helpers
│   ├── backup.sh               nightly: CLI exports + volume snapshot, 14 days
│   ├── restore.sh              put a backup back; also runs the drill
│   ├── update.sh               pin a version, back up, then pull and restart
│   └── import-workflows.sh     load the starter workflows
├── workflows/
│   ├── rss-to-email-digest.json
│   └── webhook-to-telegram-alert.json
├── reverse-proxy/
│   ├── nginx.conf.example
│   └── Caddyfile.example
└── backups/                    created on first run, gitignored
```

## Prerequisites

- A VPS with Docker Engine and the Compose v2 plugin.
- A reverse proxy already terminating TLS (nginx, Caddy, Traefik — you have
  one).
- A DNS `A`/`AAAA` record for the subdomain, e.g. `n8n.example.com`,
  pointing at the box, with a certificate issued for it.
- Your user in the `docker` group (so cron can run the backup without root).

---

## First boot

### 1. Put the files on the box

```bash
sudo mkdir -p /opt/n8n && sudo chown "$USER" /opt/n8n
# copy this directory's contents to /opt/n8n
cd /opt/n8n
chmod +x scripts/*.sh
```

### 2. Configure

```bash
cp .env.example .env
chmod 600 .env
openssl rand -base64 32       # → N8N_ENCRYPTION_KEY, and into your password manager
```

Edit `.env` and set at minimum:

| Variable | What it is |
|---|---|
| `N8N_ENCRYPTION_KEY` | The key from above. Back it up separately. |
| `N8N_HOST` | Your subdomain, e.g. `n8n.example.com`. No scheme, no trailing slash. |
| `N8N_IMAGE_TAG` | An explicit version, e.g. `2.32.7`. Never `latest`. |
| `GENERIC_TIMEZONE` | IANA name, e.g. `Europe/London`. Drives schedule triggers. |

`N8N_HOST` is what `WEBHOOK_URL` and `N8N_EDITOR_BASE_URL` are built from in
`docker-compose.yml`, so external services calling your webhooks get the
right public address rather than `localhost`.

### 3. Start it

```bash
docker compose up -d
docker compose logs -f n8n     # ctrl-c once you see "Editor is now accessible"
```

It binds to `127.0.0.1:5678`. Nothing reaches it from the internet yet, which
is correct — check with `ss -ltnp | grep 5678` and confirm the address is
`127.0.0.1` and not `0.0.0.0`.

### 4. Wire up the reverse proxy

Copy `reverse-proxy/nginx.conf.example` or `Caddyfile.example` into your
existing config, change the hostname, reload.

The two settings that matter and are easy to miss: the **WebSocket upgrade
headers** (without them the editor loads and then silently stops updating)
and a **long read timeout** (without it, workflows calling slow APIs get cut
off at 60 seconds).

### 5. Create the owner account

Open `https://n8n.example.com` in a browser. The first visit lands on the
setup screen. **The first account created is the instance owner** — it is
the admin, and there is no separate root login behind it.

Create it now, before anything else can reach the URL. n8n's own user
management is what guards the editor: there is no basic-auth layer in front,
so between the proxy going live and this account existing, the setup screen
is open to whoever finds it.

Use a real email (it is the password-reset path) and a password from your
password manager. Then turn on 2FA under **Settings → Personal → Two-factor
authentication**.

### 6. Import the starter workflows

```bash
./scripts/import-workflows.sh
```

Two workflows land, both **inactive**, with no credentials attached:

**Starter — RSS to email digest.** Schedule trigger at 07:00 → read a feed →
collapse the last 24 hours into one HTML email → send over SMTP. On a day
with no new items it sends nothing rather than an empty email. Attach an SMTP
credential, set the real from/to addresses, point it at a feed you actually
read, run it once by hand, then activate.

**Starter — webhook to Telegram alert.** `POST /webhook/alert` → check a
shared-secret header → format the payload → send to Telegram → respond 200.
Attach a Telegram bot credential, set your chat id (message `@userinfobot`
for it), and replace the placeholder token in the *Verify token and format*
node — the workflow refuses to run until you do, because the webhook path is
public and that header is the only thing standing between the internet and
your phone.

Then activate it and prove the whole path works from outside:

```bash
curl -X POST https://n8n.example.com/webhook/alert \
  -H 'Content-Type: application/json' \
  -H 'X-Alert-Token: <your token>' \
  -d '{"level":"error","source":"curl","message":"hello from outside"}'
```

A Telegram message arriving means DNS, TLS, the reverse proxy, `WEBHOOK_URL`
and n8n all agree with each other. That is the real smoke test — more useful
than anything you can check from inside the box.

Both files carry stable workflow ids, so re-running the import updates them
in place instead of piling up duplicates.

### 7. Schedule the backup

See below. Do this on day one, not after the first thing you'd miss.

---

## Nightly backups

```bash
./scripts/backup.sh
```

Writes `backups/YYYY-MM-DD/`:

| File | What it is |
|---|---|
| `workflows/*.json` | One file per workflow, via `n8n export:workflow` |
| `credentials/*.json` | One file per credential, **encrypted** |
| `credentials.decrypted.json` | Only if `BACKUP_DECRYPT_CREDENTIALS=1` |
| `n8n-data.tar.gz` | The whole `/home/node/.n8n` volume — SQLite DB and all |
| `MANIFEST.txt` | Versions, counts, and a sha256 of every file above |

Two restore paths on purpose. The tarball puts the instance back exactly as
it was and is what the restore drill uses. The JSON exports are portable and
diffable, and will still be readable by an n8n years from now that would
refuse today's SQLite file.

**n8n stops for a few seconds** while the volume is tarred. Copying a live
SQLite database is how you end up with a backup that only looks fine — the
script takes the short outage instead. If the tar fails, n8n is restarted
anyway before the script exits.

Retention is `BACKUP_RETENTION_DAYS` (14). Older dated directories are
pruned at the end of each run.

### Cron

```bash
crontab -e
```

```cron
15 3 * * * cd /opt/n8n && ./scripts/backup.sh >> /var/log/n8n-backup.log 2>&1
```

Run it as the user in the `docker` group, not root. Check the log after the
first night — a backup you have never seen succeed is a hypothesis.

### Get them off the box

Fourteen days of backups on the same VPS protects you against *"I deleted a
workflow"*. It does nothing about *"the VPS is gone"*. Ship them somewhere
else:

```cron
30 3 * * * rsync -a --delete /opt/n8n/backups/ backup-host:/srv/n8n-backups/
```

or point restic/rclone at `/opt/n8n/backups`. If you enabled
`BACKUP_DECRYPT_CREDENTIALS=1`, the destination must be encrypted — that file
is every API key you own in clear text.

### On `BACKUP_DECRYPT_CREDENTIALS`

Off by default. Encrypted credential exports are safe to store but only
restorable while you still have the encryption key. A decrypted export is the
escape hatch if the key is ever lost — and simultaneously the worst file on
your server. Leave it off unless the backup destination is itself encrypted,
and treat turning it on as a decision, not a default.

---

## Restore drill

**Do this once now, and once a quarter after.** An untested backup is not a
backup, and the moment you find out is never a good one.

The drill restores yesterday's backup into a *throwaway* volume on a
*different port*, alongside the real instance, which keeps running.

### 1. Restore into a scratch stack

```bash
cd /opt/n8n

N8N_VOLUME_NAME=n8n_drill \
N8N_CONTAINER_NAME=n8n-drill \
N8N_BIND_PORT=5679 \
  ./scripts/restore.sh backups/2026-08-01 --project n8n-drill --deactivate-all
```

`--deactivate-all` matters. A restored instance comes back with its workflows
still marked active, and n8n re-arms every schedule trigger at boot — two
instances holding the same active workflows means two of every email. The
flag stands them down as soon as the instance is healthy. There is still a
few-second window at boot before it takes effect, so run drills at a time
when your schedules are not about to fire.

The script verifies the manifest checksums before it touches anything, and
refuses to restore a backup that fails them.

### 2. Look at it

The drill instance is on `127.0.0.1:5679`, not exposed publicly. Tunnel in
from your laptop:

```bash
ssh -L 5679:127.0.0.1:5679 you@your-vps
```

then open `http://localhost:5679`. Some of the UI will misbehave because
`N8N_EDITOR_BASE_URL` still points at the real hostname — that's expected and
not what you're testing. Check the three things that matter:

1. **You can log in** with the owner account. (The users table restored.)
2. **Your workflows are there**, with the right nodes in them.
3. **A credential still decrypts.** Open a workflow that uses one, hit *Test
   step*. This is the real test — it proves `N8N_ENCRYPTION_KEY` in `.env`
   still matches the key the backup was taken with. If this fails, your
   backups have been useless for however long the keys have been out of sync,
   and you want to know that today.

### 3. Tear it down

```bash
N8N_VOLUME_NAME=n8n_drill N8N_CONTAINER_NAME=n8n-drill N8N_BIND_PORT=5679 \
  docker compose -p n8n-drill down
docker volume rm n8n_drill
```

### Restoring for real

When it is not a drill — the box is rebuilt, or you need to roll something
back:

```bash
cd /opt/n8n
# 1. .env must have the SAME N8N_ENCRYPTION_KEY as when the backup was taken.
#    Get it from your password manager. Check this BEFORE restoring.
./scripts/restore.sh backups/2026-08-01
```

No `--deactivate-all` here: you want the workflows to come back running. The
script snapshots the current volume to `backups/.pre-restore-<timestamp>.tar.gz`
first, so restoring the wrong backup is itself recoverable.

Restoring onto a fresh box: install Docker, copy this directory across, write
`.env` with the original encryption key, drop the backup directory in place,
run `restore.sh`, point DNS at the new box.

---

## Updating

```bash
./scripts/update.sh 2.33.3
```

In order: reject moving tags → confirm the tag exists in the registry → take
a full backup → rewrite the pin in `.env` → pull → recreate → wait for
`/healthz` → tell you what to check.

**Never `docker compose pull` on `:latest`.** The tag is pinned in `.env` for
a reason: with a moving tag, any restart — a `compose up -d`, a host reboot
with `restart: unless-stopped` — can silently change your n8n version and run
one-way database migrations at a moment nobody chose. `update.sh` refuses
`latest`, `stable`, `next` and `nightly` outright.

### Finding the version to move to

Docker's `latest` and `stable` tags track n8n's stable channel, which lags the
newest published version number by a release or two. That lag is deliberate
and you want it.

```bash
# what the stable channel currently is
curl -s https://hub.docker.com/v2/repositories/n8nio/n8n/tags/stable |
  grep -o '"digest":"[^"]*"'

# find the numbered tag with that digest
curl -s 'https://hub.docker.com/v2/repositories/n8nio/n8n/tags?page_size=100&ordering=last_updated' |
  tr ',' '\n' | grep -E '"(name|digest)"'
```

Read the release notes between your version and the target before a minor or
major bump. n8n also shows an update banner in the editor —
`N8N_VERSION_NOTIFICATIONS_ENABLED` is left on so it can.

### After updating

```bash
docker compose logs --since 10m n8n | grep -iE 'error|deprecat'
```

Open the editor, load one workflow, and confirm your scheduled workflows are
still marked active.

### If the update goes wrong

**Do not just pin the old tag and restart.** If the new version already ran
database migrations, the old version cannot read the migrated database and
will fail in a new and more confusing way. The correct rollback is the
pre-update backup, which contains the un-migrated database:

```bash
./scripts/restore.sh backups/$(date +%F)
# then set N8N_IMAGE_TAG back in .env
docker compose up -d
```

This is exactly why `update.sh` backs up first and refuses to continue if
the backup fails.

---

## Day to day

```bash
docker compose ps                      # is it up
docker compose logs -f n8n             # follow logs
docker compose restart n8n             # restart
docker compose exec -u node n8n n8n --version

# what's on disk
du -sh backups/*
docker system df

# export one workflow by hand
docker compose exec -u node n8n n8n export:workflow --id=<id> --pretty
```

Execution history is pruned automatically after `EXECUTIONS_DATA_MAX_AGE`
hours (336 = 14 days), which is what stops SQLite growing without bound.

---

## Troubleshooting

**Editor loads, then nothing updates live.** Missing WebSocket upgrade
headers in the reverse proxy. See the marked block in the nginx example.

**Workflows time out around 60 seconds.** `proxy_read_timeout` in nginx, or
`read_timeout` in Caddy.

**Webhook URLs show `localhost`.** `N8N_HOST` is wrong or `.env` didn't get
picked up. Check `docker compose exec n8n printenv WEBHOOK_URL` — it should be
your public HTTPS URL.

**External service gets a 404 on a webhook.** Test webhooks
(`/webhook-test/...`) only exist while the editor has *Listen for test event*
open. The production path is `/webhook/...` and needs the workflow
**activated**.

**"Credentials could not be decrypted".** `N8N_ENCRYPTION_KEY` does not match
what the data was written with. Do not "fix" this by rotating the key — that
destroys anything still readable. Get the original key back.

**Backup script says another ops script is running.** A previous run died
badly. Check nothing is actually running, then `rmdir /opt/n8n/.opslock`.

**Permission errors on the volume after a manual fiddle.**
`docker run --rm -v n8n_data:/d --user 0:0 --entrypoint sh
docker.n8n.io/n8nio/n8n:<tag> -c 'chown -R 1000:1000 /d && chmod 700 /d'`

---

## What you're now responsible for

The subscription was buying operations, not software. The trade is that these
four things are yours now. They are all small, but none of them are optional:

1. **The encryption key exists somewhere other than this server.** Nothing
   else in this list matters if this one isn't true.
2. **The nightly backup ran.** Check `/var/log/n8n-backup.log` occasionally.
3. **A restore has actually been performed** by you, at least once, and
   recently enough that you'd remember how.
4. **Updates are a deliberate act**, on a pinned tag, with a backup taken
   first.
