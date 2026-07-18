import { Router, type IRouter } from "express";
import { z } from "zod";
import { isAiConfigured, generateNavigatorResponse, generateDraft } from "../lib/ai";
import { isResearchConfigured, researchWithPerplexity } from "../lib/perplexity";
import { isAnyVerifierConfigured, verifyCitations } from "../lib/verification";
import { rateLimit } from "../middlewares/rateLimit";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// AI calls cost money per request, so these endpoints are rate-limited more
// tightly than retrieval and verify a Supabase token when configured to.
const aiRateLimit = rateLimit({ windowMs: 60_000, max: 10 });
const aiAuth = requireAuth({ required: process.env.AI_REQUIRE_AUTH === "true" });

const ChatRequest = z.object({
  message: z.string().trim().min(1, "message is required").max(2000),
  caseType: z.enum(["general", "fcra", "traffic", "ifp"]).optional(),
  caseContext: z.string().trim().max(1000).optional(),
});

const ResearchRequest = z.object({
  query: z.string().trim().min(1, "query is required").max(2000),
  caseContext: z.string().trim().max(1000).optional(),
});

const DraftRequest = z.object({
  documentType: z.enum(["motion", "letter", "form", "other"]),
  instructions: z.string().trim().min(1, "instructions are required").max(2000),
  caseType: z.enum(["general", "fcra", "traffic", "ifp"]).optional(),
  caseContext: z.string().trim().max(2000).optional(),
});

const VerifyRequest = z.object({
  text: z.string().trim().min(1, "text is required").max(64000),
});

router.post("/ai/chat", aiRateLimit, aiAuth, async (req, res) => {
  const parsed = ChatRequest.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_request",
      details: parsed.error.flatten(),
    });
  }

  if (!isAiConfigured()) {
    return res.status(503).json({
      error: "ai_unavailable",
      message: "The AI assistant is not configured yet (ANTHROPIC_API_KEY missing).",
    });
  }

  try {
    const result = await generateNavigatorResponse(parsed.data);
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "ai chat failed");
    return res.status(500).json({ error: "ai_failed" });
  }
});

// Research agent — Perplexity Sonar (live web research with citations).
router.post("/ai/research", aiRateLimit, aiAuth, async (req, res) => {
  const parsed = ResearchRequest.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_request",
      details: parsed.error.flatten(),
    });
  }

  if (!isResearchConfigured()) {
    return res.status(503).json({
      error: "research_unavailable",
      message: "Legal research is not configured yet (PERPLEXITY_API_KEY missing).",
    });
  }

  try {
    const result = await researchWithPerplexity(parsed.data);
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "ai research failed");
    return res.status(500).json({ error: "research_failed" });
  }
});

// Drafting agent — Claude Opus 4.8 generates a reviewable document draft.
router.post("/ai/draft", aiRateLimit, aiAuth, async (req, res) => {
  const parsed = DraftRequest.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_request",
      details: parsed.error.flatten(),
    });
  }

  if (!isAiConfigured()) {
    return res.status(503).json({
      error: "ai_unavailable",
      message: "Drafting is not configured yet (ANTHROPIC_API_KEY missing).",
    });
  }

  try {
    const result = await generateDraft(parsed.data);
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "ai draft failed");
    return res.status(500).json({ error: "draft_failed" });
  }
});

// Verification gate — checks case-law citations in text against CourtListener.
router.post("/ai/verify", aiRateLimit, aiAuth, async (req, res) => {
  const parsed = VerifyRequest.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_request",
      details: parsed.error.flatten(),
    });
  }

  if (!isAnyVerifierConfigured()) {
    return res.status(503).json({
      error: "verification_unavailable",
      message:
        "Citation verification is not configured yet (needs COURTLISTENER_API_TOKEN and/or PERPLEXITY_API_KEY).",
    });
  }

  try {
    const results = await verifyCitations(parsed.data.text);
    return res.json({ results, count: results.length });
  } catch (err) {
    req.log.error({ err }, "citation verification failed");
    return res.status(500).json({ error: "verification_failed" });
  }
});

export default router;
