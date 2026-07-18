import pg from "pg";

const { Pool } = pg;

// Lazily-initialized connection pool. Retrieval needs Postgres, but the rest of
// the server (health check, startup) must not depend on DB config being present.
// We therefore create the pool on first use rather than at import time.
//
// Connection string source priority:
//   1. SUPABASE_POOLER_URL  (Supabase session-pooler; IPv4-compatible, preferred)
//   2. DATABASE_URL          (Replit built-in Postgres; present in dev but points
//                             to the local helium DB, not Supabase)
//   3. SUPABASE_DB_PASSWORD  (legacy: full postgresql:// direct URL; DNS
//                             unreachable from Replit's network, kept as fallback)
let pool: pg.Pool | null = null;

function connectionString(): string | undefined {
  return (
    process.env.SUPABASE_POOLER_URL ??
    process.env.DATABASE_URL ??
    process.env.SUPABASE_DB_PASSWORD
  );
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
