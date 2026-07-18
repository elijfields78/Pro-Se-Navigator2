import { Router, type IRouter } from "express";
import { z } from "zod";
import { isAiConfigured, generateNavigatorResponse } from "../lib/ai";
import { rateLimit } from "../middlewares/rateLimit";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

// AI calls cost money per request, so this endpoint is rate-limited more
// tightly than retrieval and verifies a Supabase token when configured to.
const aiRateLimit = rateLimit({ windowMs: 60_000, max: 10 });
const aiAuth = requireAuth({ required: process.env.AI_REQUIRE_AUTH === "true" });

const ChatRequest = z.object({
  message: z.string().trim().min(1, "message is required").max(2000),
  caseType: z.enum(["general", "fcra", "traffic", "ifp"]).optional(),
  caseContext: z.string().trim().max(1000).optional(),
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

export default router;
