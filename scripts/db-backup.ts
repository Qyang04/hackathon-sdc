// Backup and restore any of our Postgres databases (decision D4), using pg_dump / psql inside the
// docker-compose "db" container, so nobody needs Postgres tools installed. Files go to ./backups (gitignored).
//
//   npm run db:backup                    dump DATABASE_URL from .env
//   npm run db:backup -- <url>           dump another database, e.g. Replit's (copy the URL from Replit Secrets)
//   npm run db:restore -- <file>         load backups/<file> into DATABASE_URL (replaces its tables)
//   npm run db:restore -- <file> <url>   load it into another database, e.g. the fallback
//
// Needs: docker compose up -d. "localhost" in a URL means the container itself, which is the local database.
import { spawnSync } from "node:child_process";

try {
  process.loadEnvFile(".env");
} catch {
  // no .env (e.g. on Replit): use the environment as it is
}

const [mode, ...args] = process.argv.slice(2);

function run(cmd: string[]): void {
  const res = spawnSync("docker", ["compose", "exec", "-T", "db", ...cmd], { stdio: "inherit" });
  if (res.status !== 0) {
    console.error("Failed. Is the database container running? Try: docker compose up -d");
    process.exit(res.status ?? 1);
  }
}

function urlOr(given: string | undefined): string {
  const url = given ?? process.env.DATABASE_URL;
  if (!url?.startsWith("postgres")) {
    console.error("No Postgres URL: pass one or set DATABASE_URL in .env");
    process.exit(1);
  }
  return url;
}

if (mode === "backup") {
  const url = urlOr(args[0]);
  const file = `orbyte-${new Date().toISOString().replace(/[:.]/g, "-")}.sql`;
  // --clean --if-exists: the file drops and recreates our tables, so a restore gives an exact copy
  run(["pg_dump", "--clean", "--if-exists", "--no-owner", "--no-privileges", "-d", url, "-f", `/backups/${file}`]);
  console.log(`Saved backups/${file}`);
} else if (mode === "restore" && args[0]) {
  const file = args[0].replace(/^backups[\\/]/, "");
  const url = urlOr(args[1]);
  run(["psql", "-v", "ON_ERROR_STOP=1", "-q", "-d", url, "-f", `/backups/${file}`]);
  console.log(`Restored backups/${file}`);
} else {
  console.error("Usage: db:backup [url] | db:restore <file> [url]");
  process.exit(1);
}
