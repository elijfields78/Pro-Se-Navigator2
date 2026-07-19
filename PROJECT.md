# ProSe Navigator — Project

A grounded, AI-assisted legal workspace for **pro se litigants** (people
representing themselves, no lawyer, against a represented party). It takes a
person from a grievance to a filed complaint, then manages the live case —
with citation verification as a hard gate, a locked caption/signature, tone and
banned-vocabulary guardrails, and deterministic deadline math.

> Not legal advice. ProSe Navigator is not a law firm and never files anything
> with a court — the user files; the app prepares and verifies.

## One product, two surfaces

Like Claude or Perplexity: the same identity and the same engine on a phone and
in a browser.

| Surface | Package | Stack |
|---|---|---|
| **Mobile app** | `artifacts/pro-se-navigator` | Expo / React Native / Expo Router |
| **Website** | `artifacts/navigator-web` | Next.js (App Router) / React / Tailwind |
| **API server** | `artifacts/api-server` | Express 5 / TypeScript (AI router + retrieval) |
| **Shared libs** | `lib/*` | db (drizzle), api-zod, api-client-react, api-spec |
| **Scripts** | `scripts` | legal-corpus ingestion |

Monorepo: **pnpm workspaces**. Node 22. Package manager is pnpm only
(`preinstall` enforces it).

## The engine (do not casually change — it's the product)

- **Verification** — CourtListener (primary) + Perplexity (independent second
  source); a citation neither can confirm is flagged, never silently trusted.
  Statutes/rules extracted locally require user confirmation before export.
- **Guardrails** — seven checks composed into one export gate: caption lock,
  signature lock, verification gate, tone filter, banned vocabulary (counsel
  pejoratives + sovereign-citizen terms), deadline safety margin (20% early),
  factual consistency.
- **Workflows** — a 9-phase cold-start FSM (grievance → filed complaint) with
  non-negotiable artifact gates, and a reactive module registry for live cases.
- **Meta-loop** — every drafting task streams Intake → Clarify → Verify →
  Outline → Draft → Pressure-Test → Memory-Update.
- **Deadlines** — deterministic Rule-6 math (never an LLM).

## Identity

Ivory canvas, **teal** primary (`#0D9488` light / `#00D4A0` dark), **amber**
CTAs. Light default; Counsel Dark in Settings. DM Sans body, Instrument Serif
italic wordmark, Inter on legacy screens.

## Key docs

- `CONTRACT.md` — the definition of done every task must pass.
- `TODO.md` — the ordered, feature-by-feature backlog. The loop works the
  first unchecked item.
- `TASK-RESULT.md` — regenerated after each completed task (files + notes).
- `docs/` — the three product specs, the derived reactive blueprint, the
  interface vision, the build log, and `HARDENING_LOG.md`.

## Environment

Runs in a Replit-hosted container; repo cloned fresh per session. Secrets are
Repl Secrets. See `.env.example` for every variable each runtime needs.
