# HARDENING_LOG

15-cycle hardening loop over the active product codebase.

**Baseline (before cycle 1):** workspace typecheck clean; pro-se-navigator
17/17 tests pass; navigator-web 32/32 tests pass; api-server has NO tests
(changes there kept maximally conservative). Branch: `hardening-loop`.

**Gates per cycle:** `pnpm run typecheck` (workspace — the compile gate for
every package) + both test suites. Next.js production build run at baseline,
after cycles touching navigator-web app code, and at the end.

**Out of active scope (listed for completeness):** `artifacts/mockup-sandbox`
(Replit scaffold sandbox, not part of the product; typechecks in CI),
`lib/api-client-react/src/generated/*` and `lib/api-zod/src/generated/*`
(codegen output — reviewed as generated, not hand-edited).

## File checklist

| File | Reviewed (cycle) | Notes |
|---|---|---|
| artifacts/api-server/build.mjs | 3 | reviewed lightly: esbuild bundling config, no runtime surface |
| artifacts/api-server/src/app.ts | 2 | FIXED: trust proxy (rate limit was one global bucket behind proxy); 256kb body limits |
| artifacts/api-server/src/index.ts | 3 | reviewed: PORT validation, listen error exit — sound |
| artifacts/api-server/src/lib/ai.ts | 1 | Anthropic client timeout 120s; prompts/model router reviewed, sound |
| artifacts/api-server/src/lib/courtlistener.ts | 1 | 30s fetch timeout added; status mapping tolerant of field drift |
| artifacts/api-server/src/lib/db.ts | 3 | FIXED: pool error handler (idle-client error crashed process); statement/connect timeouts; max 10 |
| artifacts/api-server/src/lib/logger.ts | 3 | reviewed: auth/cookie redaction present — sound |
| artifacts/api-server/src/lib/perplexity.ts | 1 | 90s/30s fetch timeouts added; verdict+URL double-check confirmed sound |
| artifacts/api-server/src/lib/retrieval.ts | 3 | reviewed: parameterized SQL, safe tsquery fallback, capped limit — sound |
| artifacts/api-server/src/lib/verification.ts | 1 | reviewed: 5-confirm budget bounds fan-out; honest status mapping; no change |
| artifacts/api-server/src/middlewares/auth.ts | 2 | FIXED: 10s timeout + bounded 30s token cache (was 1 Supabase round-trip per request) |
| artifacts/api-server/src/middlewares/rateLimit.ts | 2 | reviewed: fixed-window OK single-instance; sweep bounded; keyed by req.ip (now correct w/ trust proxy) |
| artifacts/api-server/src/routes/ai.ts | 2 | reviewed: zod-validated, size-capped, rate-limited, 503 on unconfigured — sound. NEEDS REVIEW: AI_REQUIRE_AUTH defaults false (paid endpoints open); product decision to flip |
| artifacts/api-server/src/routes/health.ts | 3 | reviewed: zod-validated static response — sound |
| artifacts/api-server/src/routes/index.ts | 3 | reviewed: trivial composition — sound |
| artifacts/api-server/src/routes/retrieval.ts | 2 | reviewed: zod-validated, capped limit 25 — sound; same auth-default note |
| artifacts/navigator-web/app/api/cases/[id]/advance/route.ts | — | |
| artifacts/navigator-web/app/api/cases/[id]/approve-narrative/route.ts | — | |
| artifacts/navigator-web/app/api/cases/[id]/intake/route.ts | — | |
| artifacts/navigator-web/app/api/cases/[id]/route.ts | — | |
| artifacts/navigator-web/app/api/cases/route.ts | — | |
| artifacts/navigator-web/app/api/chat/route.ts | — | |
| artifacts/navigator-web/app/app/page.tsx | — | |
| artifacts/navigator-web/app/layout.tsx | — | |
| artifacts/navigator-web/app/page.tsx | — | |
| artifacts/navigator-web/lib/db/cases.ts | — | |
| artifacts/navigator-web/lib/db/server.ts | — | |
| artifacts/navigator-web/lib/guardrails/index.ts | — | |
| artifacts/navigator-web/lib/memory/index.ts | — | |
| artifacts/navigator-web/lib/memory/supabaseStore.ts | — | |
| artifacts/navigator-web/lib/metaloop/index.ts | — | |
| artifacts/navigator-web/lib/subagents/index.ts | — | |
| artifacts/navigator-web/lib/supabaseBrowser.ts | — | |
| artifacts/navigator-web/lib/verification/courtlistener.ts | 4 | FIXED: 30s timeout on lookup; pure mapper already tested |
| artifacts/navigator-web/lib/verification/extract.ts | 4 | reviewed: conservative patterns confirmed by 2 new edge tests (multi-§, bare CFR, no bare-Rule false positives) |
| artifacts/navigator-web/lib/verification/index.ts | 4 | reviewed: budget bound, honest fallbacks, gate semantics tested — sound |
| artifacts/navigator-web/lib/verification/perplexity.ts | 4 | FIXED: 30s timeout on confirm; strict verdict parser tested |
| artifacts/navigator-web/lib/verification/types.ts | 4 | reviewed: types only — sound |
| artifacts/navigator-web/lib/workflows/coldStart.ts | — | |
| artifacts/navigator-web/lib/workflows/machine.ts | — | |
| artifacts/navigator-web/lib/workflows/reactive.ts | — | |
| artifacts/navigator-web/lib/workflows/storyIntake.ts | — | |
| artifacts/navigator-web/postcss.config.mjs | — | |
| artifacts/navigator-web/tests/coldstart.e2e.test.ts | — | |
| artifacts/navigator-web/tests/guardrails.test.ts | — | |
| artifacts/navigator-web/tests/metaloop-subagents.test.ts | — | |
| artifacts/navigator-web/tests/verification.test.ts | 4 | extended: +2 extraction edge tests (34 total web tests) |
| artifacts/navigator-web/tests/wiring.test.ts | — | |
| artifacts/pro-se-navigator/app/(auth)/_layout.tsx | — | |
| artifacts/pro-se-navigator/app/(auth)/login.tsx | — | |
| artifacts/pro-se-navigator/app/(auth)/register.tsx | — | |
| artifacts/pro-se-navigator/app/(tabs)/_layout.tsx | — | |
| artifacts/pro-se-navigator/app/(tabs)/artifacts.tsx | — | |
| artifacts/pro-se-navigator/app/(tabs)/cases.tsx | — | |
| artifacts/pro-se-navigator/app/(tabs)/chat.tsx | — | |
| artifacts/pro-se-navigator/app/(tabs)/deadlines.tsx | — | |
| artifacts/pro-se-navigator/app/(tabs)/index.tsx | — | |
| artifacts/pro-se-navigator/app/(tabs)/sources.tsx | — | |
| artifacts/pro-se-navigator/app/+not-found.tsx | — | |
| artifacts/pro-se-navigator/app/_layout.tsx | — | |
| artifacts/pro-se-navigator/app/artifacts-archive.tsx | — | |
| artifacts/pro-se-navigator/app/case/[id].tsx | — | |
| artifacts/pro-se-navigator/app/case/new.tsx | — | |
| artifacts/pro-se-navigator/app/home.tsx | — | |
| artifacts/pro-se-navigator/app/library.tsx | — | |
| artifacts/pro-se-navigator/app/navigator.tsx | — | |
| artifacts/pro-se-navigator/app/search.tsx | — | |
| artifacts/pro-se-navigator/app/settings.tsx | — | |
| artifacts/pro-se-navigator/app/usage.tsx | — | |
| artifacts/pro-se-navigator/babel.config.js | — | |
| artifacts/pro-se-navigator/components/AIMessage.tsx | — | |
| artifacts/pro-se-navigator/components/ActivityRow.tsx | — | |
| artifacts/pro-se-navigator/components/ArtifactCard.tsx | — | |
| artifacts/pro-se-navigator/components/AttachmentSheet.tsx | — | |
| artifacts/pro-se-navigator/components/CaseCard.tsx | — | |
| artifacts/pro-se-navigator/components/CaseChat.tsx | — | |
| artifacts/pro-se-navigator/components/ChatInput.tsx | — | |
| artifacts/pro-se-navigator/components/DeadlineCard.tsx | — | |
| artifacts/pro-se-navigator/components/DeadlineDateEntry.tsx | — | |
| artifacts/pro-se-navigator/components/DocumentCard.tsx | — | |
| artifacts/pro-se-navigator/components/ErrorBoundary.tsx | — | |
| artifacts/pro-se-navigator/components/ErrorFallback.tsx | — | |
| artifacts/pro-se-navigator/components/KeyboardAwareScrollViewCompat.tsx | — | |
| artifacts/pro-se-navigator/components/MessageActionSheet.tsx | — | |
| artifacts/pro-se-navigator/components/NextStepRow.tsx | — | |
| artifacts/pro-se-navigator/components/SearchBar.tsx | — | |
| artifacts/pro-se-navigator/components/TypingIndicator.tsx | — | |
| artifacts/pro-se-navigator/components/UserMessage.tsx | — | |
| artifacts/pro-se-navigator/components/VerifiedTag.tsx | — | |
| artifacts/pro-se-navigator/constants/colors.ts | — | |
| artifacts/pro-se-navigator/contexts/AuthContext.tsx | — | |
| artifacts/pro-se-navigator/contexts/CasesContext.tsx | — | |
| artifacts/pro-se-navigator/contexts/ThemeContext.tsx | — | |
| artifacts/pro-se-navigator/contexts/types.ts | — | |
| artifacts/pro-se-navigator/data/intakeScripts.ts | — | |
| artifacts/pro-se-navigator/hooks/useColorScheme.ts | — | |
| artifacts/pro-se-navigator/hooks/useColors.ts | — | |
| artifacts/pro-se-navigator/hooks/useDictation.ts | — | |
| artifacts/pro-se-navigator/hooks/useGlobalSearch.ts | — | |
| artifacts/pro-se-navigator/hooks/usePlan.ts | — | |
| artifacts/pro-se-navigator/lib/aiClient.ts | — | |
| artifacts/pro-se-navigator/lib/apiBase.ts | — | |
| artifacts/pro-se-navigator/lib/deadlineRules.ts | — | |
| artifacts/pro-se-navigator/lib/documents.ts | — | |
| artifacts/pro-se-navigator/lib/downloadArtifact.ts | — | |
| artifacts/pro-se-navigator/lib/retrievalClient.ts | — | |
| artifacts/pro-se-navigator/lib/rule6.ts | — | |
| artifacts/pro-se-navigator/lib/supabase.ts | — | |
| artifacts/pro-se-navigator/metro.config.js | — | |
| artifacts/pro-se-navigator/scripts/build.js | — | |
| artifacts/pro-se-navigator/server/serve.js | — | |
| artifacts/pro-se-navigator/tests/deadlineRules.test.ts | — | |
| artifacts/pro-se-navigator/tests/rule6.test.ts | — | |
| artifacts/pro-se-navigator/utils/autoTitle.ts | — | |
| lib/api-client-react/src/custom-fetch.ts | — | |
| lib/api-client-react/src/generated/api.schemas.ts | — | |
| lib/api-client-react/src/generated/api.ts | — | |
| lib/api-client-react/src/index.ts | — | |
| lib/api-spec/orval.config.ts | — | |
| lib/api-zod/src/generated/api.ts | — | |
| lib/api-zod/src/generated/types/healthStatus.ts | — | |
| lib/api-zod/src/generated/types/index.ts | — | |
| lib/api-zod/src/index.ts | — | |
| lib/db/drizzle.config.ts | — | |
| lib/db/src/index.ts | — | |
| lib/db/src/schema/index.ts | — | |
| lib/db/src/schema/legalCorpus.ts | — | |
| scripts/src/data/legalCorpusSeed.ts | — | |
| scripts/src/hello.ts | — | |
| scripts/src/ingest-legal-corpus.ts | — | |

## Cycle log

### Cycle 1 — api-server outbound resilience
Files: lib/perplexity.ts, lib/courtlistener.ts, lib/ai.ts (+verification.ts reviewed).
Found: no timeout on any outbound fetch (hung upstream pins request + rate-limit
slot indefinitely); Anthropic SDK default timeout 10min. Fixed: AbortSignal.timeout
(90s research / 30s confirm / 30s citation-lookup) with clear timeout errors;
Anthropic client bounded to 120s. Gates: typecheck clean, 17+32 tests pass.

### Cycle 2 — api-server security surface
Files: app.ts, middlewares/auth.ts (+rateLimit.ts, routes/ai.ts, routes/retrieval.ts reviewed).
Found: (1) trust proxy unset → per-IP rate limiting was ONE global bucket for all
users behind Replit's proxy; (2) unbounded JSON body size; (3) auth verification
uncached + no timeout (1 Supabase round-trip per request, hang-prone).
Fixed: trust proxy=1; 256kb body limits; 10s auth timeout + bounded 30s token cache.
NEEDS REVIEW: AI_REQUIRE_AUTH / RETRIEVAL_REQUIRE_AUTH default to false — paid
endpoints are open unless the env flags are set; recommend enabling in production.
Gates: typecheck clean, 17+32 tests pass.

### Cycle 3 — api-server data layer + entrypoints
Files: lib/db.ts (+retrieval.ts, logger.ts, index.ts, routes/index.ts,
routes/health.ts, build.mjs reviewed; ai.ts generation paths re-reviewed).
Found: pg Pool had NO 'error' handler — an idle pooled client error (routine
with remote Postgres) is an unhandled event that crashes the process. No
statement/connection timeouts, unbounded pool. Fixed: error handler, max 10,
10s connect / 15s statement / 30s idle timeouts.
Reviewed-sound: parameterized retrieval SQL, log redaction, PORT validation.
Gates: typecheck clean, 17+32 tests pass.

### Cycle 4 — navigator-web verification service
Files: lib/verification/{courtlistener,perplexity}.ts (+extract, index, types
reviewed; tests extended). Found: same missing-timeout class as api-server on
both adapters. Fixed with 30s AbortSignal timeouts + clear errors. Added 2
extraction edge tests (multi-section §§, bare C.F.R., large-input stability,
no bare-Rule false positives). Gates: typecheck clean, 17+34 tests pass.
