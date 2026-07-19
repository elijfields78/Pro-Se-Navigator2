# Interface Vision — "Ivory Navigator"

Owner-directed redesign (photo references, July 2026). One product, two
surfaces — phone app and website — same identity, like Claude / Perplexity /
Harvey. **Backend frozen:** workflows, meta-loop, guardrails, verification,
schema untouched. Presentation only.

## Design language

- **Canvas:** warm ivory (`#FAF9F5`), calm whitespace. Dark ("Counsel Dark")
  stays available via Settings → Appearance; light is the default.
- **Identity:** teal primary (`#0D9488` light / `#00D4A0` dark), amber CTAs.
- **Reference DNA:** Harvey's restraint, Claude mobile's floating-pill input
  and agent task rows, Perplexity's teal + source pride.
- **Tactility:** haptics on every meaningful touch (selection ticks on taps,
  light impacts on sends/FABs, success notifications on completions,
  refresh-trigger buzz). Motion is subtle and purposeful.

## Information architecture

1. **Home (`/home`)** — the app OPENS here. General chat, no forced workflow
   (the same engine runs under both doors). Top bar: profile avatar → Library
   · search pill → global search · discovery (book) → Library/Sources ·
   **New case** (amber). Center: breathing compass brand mark. Bottom:
   floating "Start a session…" card with `+` (attachments), mode pill
   (Navigator ⇄ Research), mic (dictation), amber send.
2. **Library (`/library`)** — slides from the left (avatar tap). Header:
   gear → Settings · display name · forward-arrow back. Section chips:
   **Inbox** (all cases/conversations, time-ago, long-press delete) ·
   **Artifacts** (with Download) · **Sources** (saved authorities) ·
   **Deadlines**. Floating teal **New +**, bottom search pill.
3. **New case sheet** — kept. Three tiles: **Credit Dispute** (renamed),
   Traffic Ticket, Fee Waiver. General Civil tile removed — the general chat
   IS that path and auto-detects specific workflows from what the user
   types. Optional case-name field kept.
4. **Workflow chat** — shows the agents working: `ActivityRow` trace lines
   (pulsing teal while running → check when done), each labeled with the
   model doing the work ("Claude Opus 4.8", "Sonar Pro", "CourtListener +
   Sonar"), expandable to per-citation results. Answers carry a
   "Powered by …" footnote. Artifacts render as cards with Download.

## Functional commitments

- **`+` menu:** Image · Camera · File · **Scan** (camera document capture).
- **Model attribution:** every workflow step and answer names its model.
- **Mic:** real dictation. Web (incl. Replit preview): browser speech engine,
  live transcript streaming into the input; stop → edit or send. Native
  (Expo Go): keyboard dictation with in-app hint; full native capture ships
  with a dev build (expo-speech-recognition) or a server STT key.
- **Download:** artifacts export as files on web, share-sheet on device
  (.docx generation is the server-side upgrade path).
- **Refresh:** silent data reload; native spinner + haptic only.

## Auto-routing note (build detail, deliberate)

Typing "I have a credit dispute" in the general chat should route into the
credit-dispute workflow. Implementation: suggest-and-confirm chip (not a
silent jump) so the user stays in control. Pending owner preference.
