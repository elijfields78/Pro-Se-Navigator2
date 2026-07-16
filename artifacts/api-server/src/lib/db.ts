import pg from "pg";

const { Pool } = pg;

// Lazily-initialized connection pool. Retrieval needs Postgres, but the rest of
// the server (health check, startup) must not depend on DB config being present.
// We therefore create the pool on first use rather than at import time.
//
// Connection string source priority:
//   1. DATABASE_URL  (standard; set when a Replit Postgres DB is attached)
//   2. SUPABASE_DB_PASSWORD  (used in this project: the value is a full
//      postgresql:// connection URL, not just a password token)
let pool: pg.Pool | null = null;

function connectionString(): string | undefined {
  return process.env.DATABASE_URL ?? process.env.SUPABASE_DB_PASSWORD;
}

export function isDbConfigured(): boolean {
  return Boolean(connectionString());
}

export function getPool(): pg.Pool {
  const cs = connectionString();
  if (!cs) {
    throw new Error(
      "Neither DATABASE_URL nor SUPABASE_DB_PASSWORD is set; database features are disabled.",
    );
  }
  if (!pool) {
    pool = new Pool({ connectionString: cs });
  }
  return pool;
}
