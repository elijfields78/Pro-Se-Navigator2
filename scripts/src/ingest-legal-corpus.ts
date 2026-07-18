/**
 * Phase 5a ingestion — loads the seed legal corpus into Postgres.
 *
 * Idempotent: sources are upserted by citation, and each source's chunks are
 * fully replaced on every run, so re-running always converges to the seed.
 *
 * Requires DATABASE_URL (the direct Supabase Postgres connection). Run with:
 *   DATABASE_URL=... pnpm --filter @workspace/scripts run ingest:legal-corpus
 */
import pg from "pg";
import { legalCorpusSeed } from "./data/legalCorpusSeed";

const { Pool } = pg;

async function main() {
  // Accept either DATABASE_URL (standard) or SUPABASE_DB_PASSWORD (which in
  // this project holds the full postgresql:// connection URL).
  const connectionString =
    process.env.DATABASE_URL ?? process.env.SUPABASE_DB_PASSWORD;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL or SUPABASE_DB_PASSWORD must be set to ingest the legal corpus.",
    );
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  let sourceCount = 0;
  let chunkCount = 0;

  try {
    await client.query("begin");

    for (const source of legalCorpusSeed) {
      const { rows } = await client.query<{ id: string }>(
        `insert into legal_sources
           (title, citation, url, jurisdiction, source_type, case_types)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (citation) do update set
           title        = excluded.title,
           url          = excluded.url,
           jurisdiction = excluded.jurisdiction,
           source_type  = excluded.source_type,
           case_types   = excluded.case_types
         returning id`,
        [
          source.title,
          source.citation,
          source.url,
          source.jurisdiction,
          source.sourceType,
          source.caseTypes,
        ],
      );
      const sourceId = rows[0]!.id;
      sourceCount += 1;

      // Replace chunks wholesale so edits/removals in the seed take effect.
      await client.query("delete from legal_chunks where source_id = $1", [
        sourceId,
      ]);

      for (const chunk of source.chunks) {
        await client.query(
          `insert into legal_chunks (source_id, heading, content)
           values ($1, $2, $3)`,
          [sourceId, chunk.heading, chunk.content],
        );
        chunkCount += 1;
      }
    }

    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }

  console.log(
    `Ingested ${sourceCount} legal sources and ${chunkCount} chunks.`,
  );
}

main().catch((err) => {
  console.error("Legal corpus ingestion failed:", err);
  process.exit(1);
});
