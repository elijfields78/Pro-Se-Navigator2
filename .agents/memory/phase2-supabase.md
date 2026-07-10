---
name: Phase 2 Supabase backend
description: Supabase integration details for Pro Se Navigator — auth, data layer, env vars, RLS, and Apple sign-in.
---

## Env var setup
Replit secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
The dev script in `artifacts/pro-se-navigator/package.json` re-exports the first two with the `EXPO_PUBLIC_` prefix so Metro can bundle them client-side.
Service role key is NEVER used in client code.

## Client
`lib/supabase.ts` — `createClient` with `ExpoSecureStoreAdapter` (iOS Keychain / Android Keystore). `AppState` listener in AuthContext triggers `startAutoRefresh` / `stopAutoRefresh`.

## Tables
`cases`, `messages`, `deadlines`, `verified_authorities`, `artifacts` — all in `supabase/migrations/001_initial.sql`. Every child table has `user_id uuid` (denormalized) plus a FK to `cases` with `ON DELETE CASCADE`. Column names are snake_case; `contexts/CasesContext.tsx` has explicit mapper functions (`dbToCase`, `caseToDb`, etc.).

## RLS
Child table policies double-check case ownership via an `EXISTS` subquery into `cases`, not just `user_id = auth.uid()`. This prevents cross-tenant FK linkage even if an attacker guesses a case ID.

## createCase data integrity
`createCase` inserts the case first, then the opening message — both awaited. On message insert failure it deletes the case (orphan cleanup) and throws.

## sendMessage data integrity
`sendMessage` does an optimistic state update, then awaits both a message insert and a case update in parallel via `Promise.all`. On any failure it rolls back to pre-send state and rethrows. `CaseChat.tsx` catches these and shows an `Alert`.

## Apple sign-in
`signInWithApple()` returns `boolean` — `true` = signed in, `false` = user canceled. Nonce uses `expo-crypto.getRandomBytesAsync(32)` (CSPRNG). Requires Apple configured as an OAuth provider in the Supabase dashboard (see SQL migration file for link).

**Why:** Must not signal success on user cancel (haptic) — distinguish cancel from error.
**How to apply:** Any future call sites must check the boolean return before firing success UX.
