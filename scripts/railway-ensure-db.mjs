import { execSync } from "node:child_process";
import fs from "node:fs";

function isRailway() {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT_NAME ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RAILWAY_SERVICE_ID,
  );
}

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const { PGUSER, PGPASSWORD, PGHOST, PGPORT, PGDATABASE } = process.env;
  if (PGHOST && PGUSER && PGPASSWORD && PGDATABASE) {
    const port = PGPORT || "5432";
    return `postgresql://${PGUSER}:${encodeURIComponent(PGPASSWORD)}@${PGHOST}:${port}/${PGDATABASE}?schema=public`;
  }

  return null;
}

const existing = resolveDatabaseUrl();
if (existing) {
  if (!process.env.DATABASE_URL) {
    const line = `DATABASE_URL="${existing.replace(/"/g, '\\"')}"\n`;
    fs.appendFileSync(".env", line);
    console.log("DATABASE_URL set from PG* reference variables.");
  } else {
    console.log("DATABASE_URL already configured.");
  }
  process.exit(0);
}

if (!isRailway()) {
  console.log("Skipping auto database (not running on Railway).");
  process.exit(0);
}

console.log(
  "No DATABASE_URL or PG* variables — provisioning Prisma Postgres for this deploy...",
);
console.log(
  "(For a permanent DB: add Railway PostgreSQL and reference DATABASE_URL on this service.)",
);

try {
  const url = execSync("npx --yes create-db@latest --quiet --region us-east-1", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();

  if (!url.startsWith("postgres")) {
    throw new Error(`Unexpected create-db output: ${url.slice(0, 40)}...`);
  }

  fs.appendFileSync(".env", `DATABASE_URL="${url.replace(/"/g, '\\"')}"\n`);
  console.log("DATABASE_URL written to .env for build and runtime.");
} catch (err) {
  console.error("\nAuto database provisioning failed.");
  console.error(
    "Add PostgreSQL in Railway: + New → Database → PostgreSQL, then on THIS service:",
  );
  console.error("Variables → Add Reference → Postgres → DATABASE_URL → Redeploy.\n");
  process.exit(1);
}
