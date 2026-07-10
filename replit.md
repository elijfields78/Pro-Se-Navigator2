# Pro Se Navigator

Harvey-caliber legal AI for self-represented (pro se) litigants. Organizes a case, drafts filings, tracks deadlines, and verifies every legal citation against a real primary source before it reaches a document.

## Run & Operate

- `pnpm --filter @workspace/pro-se-navigator run dev` — run the Expo dev server
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages

## Stack

- Expo (React Native), iOS-first, Expo Router file-based navigation
- TypeScript, AsyncStorage (local persistence — Supabase in future phases)
- React Query (@tanstack/react-query)
- Inter font (400/500/600/700)
- pnpm workspaces, Node.js 24, TypeScript 5.9

## Where things live

```
artifacts/pro-se-navigator/
  app/
    _layout.tsx          # Root layout — auth gating via AuthGate + useSegments
    (auth)/              # Login + register screens
    (tabs)/              # 4 tabs: cases, chat, sources, deadlines
    case/[id].tsx        # Full-screen case chat (stack push)
    case/new.tsx         # New case form (formSheet modal)
  components/
    AIMessage.tsx        # Navigator message: compass icon label, flowing text, next-step rows
    UserMessage.tsx      # User message: teal bubble, right-aligned
    ChatInput.tsx        # Pill input, mic icon, amber circular send button
    CaseChat.tsx         # Inverted FlatList + ChatInput, KeyboardAvoidingView
    CaseCard.tsx         # Case list card
    DeadlineCard.tsx     # Amber deadline card with rule and disclaimer
    VerifiedTag.tsx      # Inline green check "verified" tag
    NextStepRow.tsx      # ↳ tappable next-step rows with hairline dividers
  contexts/
    AuthContext.tsx      # Auth state (AsyncStorage — Supabase in Phase 3)
    CasesContext.tsx     # Cases, messages, deadlines, sources + intake state machine
    types.ts             # Shared TypeScript types
  data/
    intakeScripts.ts     # Per-case-type intake scripts (4 turns each)
  constants/
    colors.ts            # Design tokens (exact spec colors)
```

## Architecture decisions

- **Intake as state machine**: each case has `intakeTurnIndex` (0-based). Each user message advances the turn. At `script.length`, a wrap-up message is sent. Beyond that, post-intake canned response.
- **CasesContext is user-scoped**: all AsyncStorage keys include `userId`, so switching accounts never leaks data.
- **Auth gating via AuthGate component**: uses `useSegments` + `useRouter` inside the root layout to redirect unauthenticated users to `/(auth)/login` and authenticated users away from auth screens.
- **No gradients, no shadows, no heavy borders** — whitespace-only design per spec.
- **Disclaimer persistent**: on every auth screen and empty states. Pre-filing certification and Supabase RLS come in Phases 2–3.

## Product

Case types: General Civil, FCRA / Credit Repair, Traffic, Fee Waiver (IFP). Each has a 4-turn guided intake script. The Navigator speaks first in every case. After intake: wrap-up + free chat (AI router in Phase 6).

Build order from spec: 1 Design system ✅ → 2 Supabase data model → 3 Auth (Supabase) → 4 Case+chat ✅ → 5 RAG → 6 Model router → 7 Verification gate → 8 Deadlines → 9 Multi-agent → 10 Compliance → 11 IFP workflow → 12 FCRA workflow → 13 Traffic workflow → 14 Stripe → 15 Legal framing

## User preferences

- App name: Pro Se Navigator
- iOS-first, App Store submission via Expo Launch
- Light theme only for v1
- Phase order must be followed — complete and verify each before starting next
- Ask for API keys/tokens at the relevant phase: Supabase (Phase 2), Anthropic/Gemini/Perplexity (Phase 6), CourtListener (Phase 7), Stripe (Phase 14)

## Gotchas

- Never call models directly from the app — only through the Edge Function router (Phase 6)
- The verification gate (Phase 7) runs on ALL plans including Free — it is never paywalled
- Deadline computation is deterministic code only — never the LLM
- Compliance agent (Phase 10) must block sovereign-citizen arguments by name
- `pnpm --filter @workspace/pro-se-navigator run typecheck` to verify — not `build` (needs PORT env)
- Color tokens in `constants/colors.ts` — never hardcode hex values in components

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `expo` skill for Expo-specific patterns and pitfalls
