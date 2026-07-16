import { Router, type IRouter } from "express";
import { z } from "zod";
import { isDbConfigured } from "../lib/db";
import { searchLegalCorpus } from "../lib/retrieval";

const router: IRouter = Router();

// Contract is defined locally for now. When the OpenAPI spec (lib/api-spec)
// grows this endpoint, move these into the generated @workspace/api-zod package.
const SearchRequest = z.object({
  query: z.string().trim().min(1, "query is required").max(500),
  caseType: z.enum(["general", "fcra", "traffic", "ifp"]).optional(),
  limit: z.number().int().positive().max(25).optional(),
});

router.post("/retrieval/search", async (req, res) => {
  const parsed = SearchRequest.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_request",
      details: parsed.error.flatten(),
    });
  }

  if (!isDbConfigured()) {
    return res.status(503).json({
      error: "database_unavailable",
      message: "Retrieval is not configured (DATABASE_URL missing).",
    });
  }

  try {
    const { query, caseType, limit } = parsed.data;
    const results = await searchLegalCorpus(query, { caseType, limit });
    return res.json({ query, count: results.length, results });
  } catch (err) {
    req.log.error({ err }, "retrieval search failed");
    return res.status(500).json({ error: "retrieval_failed" });
  }
});

export default router;
