import pg from "pg";

const { Pool } = pg;

// Lazily-initialized connection pool. Retrieval needs Postgres, but the rest of
// the server (health check, startup) must not depend on DB config being present.
// We therefore create the pool on first use rather than at import time.
let pool: pg.Pool | null = null;

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool(): pg.Pool {
  if (!isDbConfigured()) {
    throw new Error("DATABASE_URL is not set; database features are disabled.");
  }
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}
