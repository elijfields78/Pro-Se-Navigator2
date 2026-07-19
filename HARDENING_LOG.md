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
| artifacts/api-server/build.mjs | — | |
| artifacts/api-server/src/app.ts | — | |
| artifacts/api-server/src/index.ts | — | |
| artifacts/api-server/src/lib/ai.ts | 1 | Anthropic client timeout 120s; prompts/model router reviewed, sound |
| artifacts/api-server/src/lib/courtlistener.ts | 1 | 30s fetch timeout added; status mapping tolerant of field drift |
| artifacts/api-server/src/lib/db.ts | — | |
| artifacts/api-server/src/lib/logger.ts | — | |
| artifacts/api-server/src/lib/perplexity.ts | 1 | 90s/30s fetch timeouts added; verdict+URL double-check confirmed sound |
| artifacts/api-server/src/lib/retrieval.ts | — | |
| artifacts/api-server/src/lib/verification.ts | 1 | reviewed: 5-confirm budget bounds fan-out; honest status mapping; no change |
| artifacts/api-server/src/middlewares/auth.ts | — | |
| artifacts/api-server/src/middlewares/rateLimit.ts | — | |
| artifacts/api-server/src/routes/ai.ts | — | |
| artifacts/api-server/src/routes/health.ts | — | |
| artifacts/api-server/src/routes/index.ts | — | |
| artifacts/api-server/src/routes/retrieval.ts | — | |
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
| artifacts/navigator-web/lib/verification/courtlistener.ts | — | |
| artifacts/navigator-web/lib/verification/extract.ts | — | |
| artifacts/navigator-web/lib/verification/index.ts | — | |
| artifacts/navigator-web/lib/verification/perplexity.ts | — | |
| artifacts/navigator-web/lib/verification/types.ts | — | |
| artifacts/navigator-web/lib/workflows/coldStart.ts | — | |
| artifacts/navigator-web/lib/workflows/machine.ts | — | |
| artifacts/navigator-web/lib/workflows/reactive.ts | — | |
| artifacts/navigator-web/lib/workflows/storyIntake.ts | — | |
| artifacts/navigator-web/postcss.config.mjs | — | |
| artifacts/navigator-web/tests/coldstart.e2e.test.ts | — | |
| artifacts/navigator-web/tests/guardrails.test.ts | — | |
| artifacts/navigator-web/tests/metaloop-subagents.test.ts | — | |
| artifacts/navigator-web/tests/verification.test.ts | — | |
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
