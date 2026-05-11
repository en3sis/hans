# Infrastructure

Production architecture for Hans: a Postgres 17 database container plus
a stateless Discord bot container, both managed by docker compose on
a single Hetzner VPS. Schema is defined in TypeScript with **Drizzle
ORM** (`src/db/schema.ts`); migrations are generated with `drizzle-kit`
and applied from your laptop over Tailscale (not as part of deploy).

Deploys are **manual**: SSH to the box, run `./infrastructure/ops/deploy.sh`.
The compose file lives on the VPS and is uploaded by hand whenever it
changes (see [Updating the compose file on the VPS](#updating-the-compose-file-on-the-vps)).
GitHub Actions only builds and pushes the bot image — it does not
touch the host.

```
infrastructure/
├── README.md
├── docker/
│   ├── Dockerfile        # multi-stage bot image (no native build)
│   └── entrypoint.sh     # registers slash commands, then exec's bot
├── compose/
│   └── docker-compose.yaml
└── ops/
    ├── deploy.sh         # manual deploy (run on the VPS)
    ├── rollback.sh       # pg_restore from a dump
    ├── backup.sh         # pg_dump wrapper
    └── migrate-remote.sh # drizzle-kit migrate against $DATABASE_URL
```

## Architecture

```
       ┌─────────────────────────────────────┐
       │ Discord Gateway                     │
       └────────────────┬────────────────────┘
                        │
       ┌────────────────▼──────────┐
       │ bot (stateless)           │   en3sis/hans:nightly
       │   • discord.js client     │   no volumes
       │   • Drizzle ORM via pg    │   restart: always
       └────────────────┬──────────┘
                        │ pg over docker network
       ┌────────────────▼──────────┐         ▲
       │ db (stateful)             │   ─ ─ ─ │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
       │   • postgres:17-alpine    │         │ tailscale serve --tcp 5432
       │   • bind mount ./data/pg  │         │  (only the tailnet — never the public internet)
       │   • bound 127.0.0.1:5432  │         │
       └───────────────────────────┘         ▼
                                       ┌──────────────────┐
                                       │ your laptop      │
                                       │  yarn db:migrate │
                                       │  yarn db:studio  │
                                       │  psql, etc.      │
                                       └──────────────────┘
```

Two services in compose, full stop: `db` and `bot`. The bot has **no
durable state**. All persistent data lives in `db`'s bind mount at
`./data/pg`. Backups (pg_dump archives) sit alongside at `./data/backups`.

**Migrations are an admin task, not part of the deploy.** You apply
them from your laptop via Tailscale, against the prod Postgres URL.
The deploy pipeline only pulls/restarts the bot container.

## Host layout

```
/home/deploy/hans/
├── .env                       # production secrets — set once, never overwritten
├── data/
│   ├── pg/                    # postgres data directory (bind-mounted)
│   └── backups/               # pg_dump archives
└── infrastructure/            # uploaded by hand from the repo
    ├── compose/docker-compose.yaml
    └── ops/{deploy,rollback,backup,migrate-remote}.sh
```

Migrations don't run on the host at all — they're applied from your
laptop over Tailscale via `yarn db:migrate:remote`. The bot image
contains no `drizzle/` files.

## One-time host setup

```bash
# 1. Install docker + compose plugin
curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin

# 2. Create the deploy dir + .env
mkdir -p ~/hans && cd ~/hans
vi .env       # copy from repo's .env.template, fill in real secrets

# 3. Upload the infrastructure files from your laptop (one-time, see
#    "Updating the compose file on the VPS" below for the path layout)

# 4. Install Tailscale and expose Postgres on the tailnet only
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up
sudo tailscale serve --bg --tcp 5432 tcp://localhost:5432
tailscale serve status   # verify the listener is registered
```

Step 4 is what makes `yarn db:migrate:remote` work from your laptop —
Postgres stays bound to `127.0.0.1` on the host, and only your tailnet
peers can reach it. The port is never exposed to the public internet.

Image-build credentials (`DOCKER_USERNAME` / `DOCKER_PASSWORD`) live
as GitHub repo secrets and are only used by `.github/workflows/` to
push `en3sis/hans:nightly` and tagged images. They are not used for
deploys.

## How a deploy flows

```
Your laptop ── ssh ──► VPS  (~/hans)
                       │
                       └─ ./infrastructure/ops/deploy.sh
                          │
                          ├─ pg_dump current db        (./data/backups/)
                          ├─ docker compose pull
                          └─ docker compose up -d      (db + bot only)
                                ↓
                                db starts → healthy
                                ↓
                                bot starts → registers slash commands → connected
```

The deploy never touches the schema. If your change includes a
migration, you apply it separately from your laptop — see
**Migrations** below for the order of operations.

## Updating the compose file on the VPS

The compose file and ops scripts are **not** synced automatically.
When they change in the repo, upload them by hand from your laptop:

```bash
# From the repo root on your laptop
rsync -av --delete \
  infrastructure/compose/ infrastructure/ops/ \
  deploy@<host>:~/hans/infrastructure/

# Or just the compose file if scripts haven't changed
scp infrastructure/compose/docker-compose.yaml \
  deploy@<host>:~/hans/infrastructure/compose/
```

Then SSH in and run `./infrastructure/ops/deploy.sh` as usual.

## Migrations

Schema and migrations are managed with [Drizzle ORM](https://orm.drizzle.team/).

**Schema** is defined in TypeScript at [`src/db/schema.ts`](../src/db/schema.ts).
That file is the single source of truth — column types, constraints,
indexes, and FK relationships all live there.

**Migrations** are auto-generated by `drizzle-kit` into `drizzle/`:

```
drizzle/
├── 0000_init.sql
├── 0001_xxx.sql        # generated by `yarn db:generate`
└── meta/_journal.json  # tracking metadata
```

### Workflow

```bash
# 1. Edit src/db/schema.ts
# 2. Generate a migration
yarn db:generate
#    → drizzle/NNNN_<auto_name>.sql

# 3. Apply locally
yarn db:migrate

# 4. Test, commit, push
git add src/db drizzle && git commit -m "schema: ..."
git push                       # CI builds the new bot image

# 5. Apply to prod (over Tailscale — see below)
DATABASE_URL=postgres://hans:****@hans-prod.<tailnet>.ts.net:5432/hans_db \
  yarn db:migrate:remote

# 6. Deploy the new bot image
#    (auto-triggered by the GH Actions workflow after CI succeeds,
#     or run ./infrastructure/ops/deploy.sh on the host manually)
```

**Order matters.** Apply schema-additive migrations BEFORE rolling
out new bot code (so the old bot keeps working while new code is
being deployed). Apply destructive migrations (drop column, etc.)
AFTER the bot rollout, once you've confirmed no code references
the removed column.

### Why this stays 1:1

Migrations are guaranteed to be byte-identical across environments:

1. The same `drizzle/` files are committed to git — your laptop and
   prod both apply them from the same source.
2. Drizzle's tracking table (`drizzle.__drizzle_migrations`) stores
   each applied migration's content hash. If your local file differs
   from what's recorded on the remote DB, the migrator refuses to
   proceed instead of silently desyncing.
3. The migrator is idempotent — applying against an already-up-to-date
   DB is a no-op (`✨ Up to date`).

### Applying / checking the remote DB

```bash
# Check status against a DB (uses DATABASE_URL from .env, or override)
yarn db:status                                                              # local
DATABASE_URL=postgres://hans:****@hans.<tailnet>.ts.net:5432/hans_db \
  yarn db:status                                                            # prod

# Apply pending migrations to prod over Tailscale
DATABASE_URL=postgres://hans:****@hans.<tailnet>.ts.net:5432/hans_db \
  yarn db:migrate:remote

# Ad-hoc psql / Drizzle Studio against prod — same tailnet URL
DATABASE_URL=postgres://hans:****@hans.<tailnet>.ts.net:5432/hans_db \
  yarn db:studio
```

`yarn db:migrate:remote` is a thin wrapper around `drizzle-kit migrate`
that masks the password in its banner and exec's drizzle-kit against
whatever `DATABASE_URL` you pass. The migration files in `drizzle/` are
the source of truth — applied by content hash, so local and remote
stay byte-for-byte identical.

Drizzle doesn't ship a built-in `down` migrator. For ad-hoc rollbacks,
restore from a `pg_dump` backup (see Rollback section below) — that's
both safer and what you'd want in a real incident anyway.

The `db:studio` script also opens [Drizzle Studio](https://orm.drizzle.team/drizzle-studio/overview)
locally for a visual schema + data browser:

```bash
yarn db:studio    # opens https://local.drizzle.studio
```

## Deploying

```bash
ssh deploy@<host>
cd ~/hans
./infrastructure/ops/deploy.sh                  # latest nightly
IMAGE_TAG=v2.2.0 ./infrastructure/ops/deploy.sh # pinned tag
```

`deploy.sh` takes a `pg_dump` backup, pulls the bot image, then runs
`docker compose up -d` against the compose file at
`infrastructure/compose/docker-compose.yaml`. The db container is left
untouched on every deploy — only the bot is recreated when its image
changes.

If the compose file or ops scripts changed in this repo since the last
deploy, upload them first — see [Updating the compose file on the VPS](#updating-the-compose-file-on-the-vps).

## Rollback (data restore)

```bash
ssh deploy@<host>
cd ~/hans
./infrastructure/ops/rollback.sh                                  # latest dump
./infrastructure/ops/rollback.sh ./data/backups/hans-<ts>.dump    # specific
```

Stops the bot (db stays up), runs `pg_restore --clean --if-exists`
to drop existing objects and restore from the dump, then restarts the
bot.

## Backups

`pg_dump`-driven, custom format (`-Fc`), gzip-compressed level 9.
Auto-runs before every deploy; trigger manually with:

```bash
ssh deploy@<host>
cd ~/hans
./infrastructure/ops/backup.sh
```

Retention defaults to 14 dumps (env `RETENTION=N ./backup.sh` to
override). They live in `./data/backups/`.

Off-host backups (recommended) — example cron:

```cron
# every hour, ship newest dump off-box
17 * * * * rsync -a /home/deploy/hans/data/backups/ user@backup-host:/path/
```

## Reviewing data

On the VPS, the Postgres CLI is available inside the db container:

```bash
docker exec -it hans-db psql -U hans -d hans
```

From your laptop, point any tool that speaks Postgres (psql, TablePlus,
pgAdmin, DBeaver) at the tailnet URL — no SSH tunnel needed:

```bash
psql "postgres://hans:****@hans.<tailnet>.ts.net:5432/hans_db"
```

## Initial data migration (legacy DB → new Postgres)

One-time procedure to seed the new Postgres container with data from
a legacy database. Run from your laptop.

> ⚠️ **The bot must NOT be running during this procedure.** On first
> boot the bot seeds default rows into `guilds_plugins` with
> `metadata: null`. Those rows then collide with the real rows from
> the dump and `pg_restore --data-only` silently skips them (it logs
> errors but exits 0), leaving you with empty metadata. Bring the bot
> up only after the sanity check passes.

```bash
# 1. Dump the legacy DB (custom format)
pg_dump --no-owner --no-acl --format=custom --compress=9 \
  "postgres://postgres:****@<legacy-host>:5432/postgres" \
  > hans-legacy.dump

# 2. Bring up ONLY the db container on the VPS (bot stays down)
ssh deploy@<host> "cd ~/hans && docker compose \
  -f infrastructure/compose/docker-compose.yaml --project-directory . \
  up -d db"

# 3. Apply the Drizzle schema (creates empty tables) over Tailscale
DATABASE_URL=postgres://hans:****@hans.<tailnet>.ts.net:5432/hans_db \
  yarn db:migrate

# 4. Load rows into the new schema. --disable-triggers avoids FK ordering
#    issues; tee'ing to a log lets you grep for silent ERROR lines after.
pg_restore --data-only --no-owner --no-acl --disable-triggers --verbose \
  -d "postgres://hans:****@hans.<tailnet>.ts.net:5432/hans_db" \
  hans-legacy.dump 2>&1 | tee restore.log
grep -i error restore.log || echo "✅ no errors"

# 5. Sanity check — verify rows AND that jsonb columns came through
psql "postgres://hans:****@hans.<tailnet>.ts.net:5432/hans_db" \
  -c "\dt" \
  -c "select count(*) from guilds;" \
  -c "select count(*) from guilds_plugins where metadata is not null;"

# 6. NOW deploy the bot
ssh deploy@<host> "cd ~/hans && ./infrastructure/ops/deploy.sh"
```

`--data-only` is important: step 3 already created the tables, so we
only restore rows. If the legacy schema has columns that don't exist
in the current Drizzle schema, those columns are silently skipped —
diff the two schemas first if you're unsure.

### If you already booted the bot before restoring

`pg_restore --data-only` will have skipped most rows due to PK
conflicts. Recover by truncating and redoing the restore:

```bash
# 1. Stop the bot
ssh deploy@<host> "cd ~/hans && docker compose \
  -f infrastructure/compose/docker-compose.yaml --project-directory . \
  stop bot"

# 2. Truncate the data tables (drizzle.__drizzle_migrations stays intact)
psql "postgres://hans:****@hans.<tailnet>.ts.net:5432/hans_db" <<'SQL'
TRUNCATE
  command_usage,
  guild_quests,
  users_settings,
  guilds_plugins,
  guilds,
  plugins,
  configs
RESTART IDENTITY CASCADE;
SQL

# 3. Re-run step 4 from above, then step 5, then bring the bot back up.
```
