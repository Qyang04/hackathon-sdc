# Deploy and database runbook

Decision D4: PostgreSQL everywhere. Only `DATABASE_URL` changes between databases; the code and schema are the same.

| Database | Where | Used for |
| --- | --- | --- |
| Replit PostgreSQL | Replit (paid from Replit Core, PH 9.1.1) | The live app the judges open |
| Docker Postgres (`docker-compose.yml`, port 5433) | Your laptop | Local development, backups, recording the video if Replit is down |
| Standby cloud Postgres (optional, e.g. a free Neon or Supabase project) | Outside Replit | Fallback for the live app if Replit database credit runs out |

The laptop database cannot serve the Replit app: Replit cannot reach `localhost` on your laptop. Only a cloud database can replace Replit PostgreSQL for the live link.

## First deploy on Replit

1. Replit, **Create, Import from GitHub**, choose this repo, branch `main`. Do not let Replit Agent build or change
   anything; if it already did, `git reset --hard origin/main` and `git clean -fd` in the Shell.
2. Shell (the **+** next to Preview): `npm install`, then `npm test`.
3. Tools, **Database**: add PostgreSQL. Replit sets `DATABASE_URL` in Secrets; do not add it by hand.
4. Secrets: add `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` if AI is used (D5). Never put them in the repo.
5. Shell: `npx prisma db push` (creates the tables), then `npm run db:seed`.
6. **Publish**: build and run commands come from the `[deployment]` section of `.replit` (`npm run build`,
   `npm run start`, which listens on `0.0.0.0` and `$PORT`); the Publish screen has no fields for them. Choose
   Autoscale, the smallest machine with max 1, region Asia, and tick "Set up your production database with your current
   development data". Leave analytics and the other add-ons off.
7. The live site uses the production database. If it ever needs fresh demo data, open the live site as Owner and press
   **Reset demo data**.
8. Open the `.replit.app` link in an incognito window. Save a screenshot of the deployment page and the URL for the
   Technical & Tools Declaration (PH 10.6).

To update the live site: `git pull` in the Replit Shell, then **Publish** again.

If pasting into the Replit Shell adds `^[[200~` in front of a command, type the command by hand or paste one line at a
time.

Replit PostgreSQL sleeps when idle; the first request after a quiet period can take a few seconds. Open the live link
once before recording the video or before judging.

## Backups

Needs `docker compose up -d` (pg_dump and psql run inside that container). Files go to `backups/` (gitignored).

```bash
npm run db:backup                         # local database (DATABASE_URL in .env)
npm run db:backup -- "<replit url>"       # the live database; copy the URL from Replit Secrets
npm run db:restore -- <file>              # load a backup into the local database (replaces its tables)
npm run db:restore -- <file> "<url>"      # load it into another database, e.g. the standby
```

The demo data can always be rebuilt with **Reset demo data**, so a backup matters only for state you want to keep,
such as the decisions made while recording the video. Take one after each recording.

## If Replit credit runs low

1. Check usage in Replit (Account, Usage). The database and the deployment both use credit.
2. Database credit low: create the standby cloud Postgres, then `npm run db:restore -- <latest backup> "<standby url>"`
   (or `npx prisma db push` and **Reset demo data**). Change `DATABASE_URL` in the deployment's Secrets to the standby
   URL and redeploy. The live link stays on Replit, which still counts as Replit use.
3. Replit itself unavailable: run locally (`docker compose up -d`, `npm run build`, `npx next start`) to record the demo,
   and tell the organisers on Discord (PH 8.3 covers platform outages). The live link must still be on Replit for the
   submission, so act early.

## Local notes

- `npm run start` uses `${PORT:-3000}`, which works on Replit (Linux) but not in Windows `cmd`. On Windows use
  `npx next start` instead.
- Port 5433 is used on purpose so this database never clashes with another Postgres on 5432.
- `npm run db:reset` asks for confirmation when run by an AI assistant; run it yourself.
