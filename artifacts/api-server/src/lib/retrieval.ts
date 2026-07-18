import { getPool } from "./db";

export interface RetrievalResult {
  citation: string;
  title: string;
  url: string;
  jurisdiction: string;
  sourceType: string;
  heading: string;
  /** Highlighted snippet of the matching chunk (plain-English explanation). */
  excerpt: string;
  /** Full-text relevance score (ts_rank). Higher is more relevant. */
  score: number;
}

/**
 * Phase 5a retrieval: Postgres full-text search over the shared legal corpus.
 *
 * Uses `websearch_to_tsquery`, which parses lay input (quoted phrases, plain
 * words) safely — malformed or empty queries yield an empty tsquery and simply
 * return no rows rather than erroring. Semantic (vector) ranking is layered on
 * in Phase 5b once an embedding provider is chosen.
 */
export async function searchLegalCorpus(
  query: string,
  opts: { caseType?: string; limit?: number } = {},
): Promise<RetrievalResult[]> {
  const limit = Math.min(Math.max(opts.limit ?? 8, 1), 25);
  const caseType = opts.caseType ?? null;

  // Use OR-based matching in WHERE (any significant term matches) so that
  // natural-language queries like "how many days to answer a complaint" hit
  // chunks that contain individual relevant words, not every word at once.
  // ts_rank still uses the AND query, so chunks matching more terms rank higher.
  // NULLIF guard: if the input has no indexable words the AND cast produces ''
  // which would error; fall back to matching nothing in that case.
  const sql = `
    select
      s.citation,
      s.title,
      s.url,
      s.jurisdiction,
      s.source_type as "sourceType",
      c.heading,
      ts_headline(
        'english', c.content,
        websearch_to_tsquery('english', $1),
        'MaxWords=45, MinWords=18, ShortWord=3'
      ) as excerpt,
      ts_rank(c.content_fts, websearch_to_tsquery('english', $1)) as score
    from legal_chunks c
    join legal_sources s on s.id = c.source_id
    where c.content_fts @@ to_tsquery(
        'english',
        coalesce(
          nullif(
            regexp_replace(
              websearch_to_tsquery('english', $1)::text,
              ' & ', ' | ', 'g'
            ),
            ''
          ),
          'false'
        )
      )
      and ($2::text is null or $2 = any(s.case_types))
    order by score desc
    limit $3
  `;

  const { rows } = await getPool().query(sql, [query, caseType, limit]);
  return rows.map((r) => ({
    citation: r.citation,
    title: r.title,
    url: r.url,
    jurisdiction: r.jurisdiction,
    sourceType: r.sourceType,
    heading: r.heading,
    excerpt: r.excerpt,
    score: Number(r.score),
  }));
}
