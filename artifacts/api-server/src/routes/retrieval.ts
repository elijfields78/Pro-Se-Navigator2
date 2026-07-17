import { Router, type IRouter } from "express";
import { z } from "zod";
import { isDbConfigured } from "../lib/db";
import { searchLegalCorpus } from "../lib/retrieval";
import { rateLimit } from "../middlewares/rateLimit";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// Abuse/cost protection: this endpoint runs DB full-text queries. Cap per-IP
// request rate. Auth is opt-in via RETRIEVAL_REQUIRE_AUTH so the endpoint keeps
// working before the mobile client attaches its Supabase session token; when a
// token IS supplied it is verified and the user id is attached regardless.
const searchRateLimit = rateLimit({ windowMs: 60_000, max: 30 });
const searchAuth = requireAuth({
  required: process.env.RETRIEVAL_REQUIRE_AUTH === "true",
});

// Contract is defined locally for now. When the OpenAPI spec (lib/api-spec)
// grows this endpoint, move these into the generated @workspace/api-zod package.
const SearchRequest = z.object({
  query: z.string().trim().min(1, "query is required").max(500),
  caseType: z.enum(["general", "fcra", "traffic", "ifp"]).optional(),
  limit: z.number().int().positive().max(25).optional(),
});

router.post("/retrieval/search", searchRateLimit, searchAuth, async (req, res) => {
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
