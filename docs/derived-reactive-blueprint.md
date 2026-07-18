# Derived Reactive Workflow Blueprint

**Status: DERIVED — PENDING OWNER APPROVAL. Do not build the reactive FSM from this document until approved.**

The Workflow Blueprint v1.0 was referenced by the master build prompt but not
provided. This document reconstructs the reactive workflow — its fourteen
modules, the seven guardrails, and the chip library — from the three sources
that were provided:

- *ProSe Navigator Cold-Start Workflow* v1.0 (esp. §15, the handoff table)
- *Internal Engineering Audit* v1.0 (esp. §5 real examples, §10–11 architecture)
- *Strategic Case Analysis, Fields v. Chase* (a worked instance of reactive-mode
  operation: docket map, deadline windows, motion drafting, count survivability,
  regulatory pressure, tone rules)

Anything here that contradicts the real Blueprint v1.0 should be corrected from
that document when it surfaces. Open questions are collected at the end.

---

## 1. The Reactive Workflow in One Paragraph

The reactive workflow begins where cold-start ends: a docket number exists and
the case is live. The unit of work is no longer "build a case from nothing" but
"respond correctly and on time to whatever the court or the opposing party does
next, while building affirmative pressure." Every inbound court document is
ingested, classified, and routed; every deadline is tracked with a safety
margin; every outbound document runs the seven-step meta-loop and cannot export
without passing the seven guardrails.

## 2. The Fourteen Modules

| # | Module | What it does | Grounding |
|---|--------|--------------|-----------|
| 1 | **Filing Intake & Classification** | Upload/ingest a court document; OCR; extract filing type, ECF #, date, parties; auto-route to the right module. | Audit §11 Layer 1 |
| 2 | **Docket Ledger** | The chronological record of every filing with status (pending / briefed / ruled / mooted). The case's spine. | Case Analysis §2 docket map |
| 3 | **Deadline Engine** | Every court deadline stored twice (actual + 20% safety margin); computes response windows and recommended filing windows; drives all reminders. | Build prompt; Case Analysis §2 & App. B filing windows |
| 4 | **Drafting Studio** | The seven-step meta-loop applied to any outbound document (motion, opposition, reply, notice, letter). | Audit §5.1; build prompt |
| 5 | **Response Generator** | Specialization of the Studio for inbound attacks: given an opposing motion, produce the opposition with authority, on deadline. | Audit §5.1 (ECF 36 opposition) |
| 6 | **Strategic Analysis** | Case-posture review on demand: pending-motion map, leverage points, "hidden moves," what the opponent/court likely does next. | Audit §5.2; Case Analysis §§4–7 |
| 7 | **Count Survivability / Pressure-Test Panel** | Ranks each live count against the plausibility standard; identifies the thinnest element and the opponent's likely attacks; recommends re-pleading where needed. | Case Analysis §5; Cold-Start §9.3 |
| 8 | **Discovery Manager** | Rule 26(f) conference tracking, initial disclosures, targeted early-discovery requests, motion-to-compel support, produced-document index. | Case Analysis §§4.1–4.3 |
| 9 | **Evidence & Exhibit Manager** | Master exhibit list inherited from cold-start Phase 2; claim-element crosswalk; per-filing exhibit numbering and references. | Cold-Start §15; Audit §11 Layer 2 |
| 10 | **Authority Bank (Citation Verifier)** | Per-case registry of verified authorities (like Case Analysis App. A); every citation verified before use; verification report generated per export. | Audit §5.4, §10.4 |
| 11 | **Regulatory Complaint Manager** | Drafts/tracks CFPB, OCC, state-regulator complaints and their response windows as parallel pressure, with responses indexed as evidence. | Case Analysis §4.5; Cold-Start §7.1 |
| 12 | **Service & Certificates** | Certificates of service on every filing; service tracking; correct addresses/registered agents. | Cold-Start §11; Case Analysis §3.1 |
| 13 | **Settlement Tracker** | Rule 408 communication drafting and log; decision-point checklists; records when leverage events occur (ruling, scheduling order, regulator escalation). | Case Analysis §§7–8 |
| 14 | **Case Memory & Timeline** | Canonical caption/signature/tone profile, correction history, asset index, and the vertical event timeline (filings, service, calls, drafts, deadlines). | Audit §6, §10.5; build prompt UI |

Modules 1–3 are the always-on backbone. Modules 4–7 are drafting/thinking
surfaces. Modules 8–13 are campaign tools. Module 14 is cross-cutting state.

## 3. The Seven Guardrails (fire on every export)

1. **Caption lock.** The export's caption must byte-match the canonical caption
   in case memory. A chat turn can never mutate the caption; changing it
   requires an explicit settings-level action with confirmation. (Failure mode
   this prevents: the "Dawn M. Fields / Global Legends Trust" caption incident,
   Audit §9.)
2. **Signature lock.** Same mechanic for the signature block (name, "Pro Se,"
   address, phone, email).
3. **Verification gate.** Every statutory and case citation in the document
   must have a `verified` record in the Authority Bank (primary source URL +
   matched quote + checked-at timestamp). Any unverified citation blocks export
   and is surfaced to the user. A verification report accompanies every export.
4. **Tone filter.** The user's tone profile (e.g., "measured," "no exclamation
   points") is applied as a lint pass; violations are rewritten or flagged.
5. **Banned-vocabulary filter.** Hard-blocked about opposing counsel: "lied,"
   "knowingly misrepresented," "deceived," "bully," "fraud" → replaced with
   record-based framing ("the record demonstrates," "Defendant's position
   appears to be," "with respect"). Hard-blocked everywhere:
   sovereign-citizen vocabulary ("natural person," "administrative default,"
   "tacit agreement by silence," "indentured trustee," "silent dishonor").
6. **Deadline safety margin.** Any deadline printed in a document or shown in
   UI reminders uses the safety date (20% earlier); the actual date is stored
   and displayed alongside it, clearly labeled.
7. **Factual-consistency check.** Every substantive factual assertion must be
   traceable to an evidence-index item, a docket entry (ECF #), or a verified
   authority (Case Analysis App. C). Untraceable assertions are flagged for the
   user before export.

Implementation note: guardrails are pure functions over (document, caseMemory)
composed into a single export gate. The download/share handler is only
reachable through the gate.

## 4. Chip Library (derived)

Chips are 4–6 context-sensitive next-step buttons. Derived set, by context:

**A filing was just ingested (opposing motion):** `Draft my opposition` ·
`Explain this in plain English` · `What's my deadline?` · `How will this
affect my case?` · `Add to timeline` · `Pressure-test their motion`

**A filing was just ingested (court order):** `What does this order mean?` ·
`What do I need to do now?` · `Update my deadlines` · `Add to timeline`

**A draft was just generated:** `Pressure-test this` · `Show verification
report` · `Tighten the tone` · `Download .docx` · `Add exhibits` · `Start
certificate of service`

**A deadline is approaching (safety date hit):** `Start the draft now` ·
`Show me what's due` · `I already filed this` · `Request extension guidance`

**Idle / case dashboard:** `What should I do next?` · `Strategic review` ·
`Check my deadlines` · `Draft something` · `Log an event` · `Search my case`

**Discovery context:** `Draft initial disclosures` · `Propose a 26(f) plan` ·
`Draft targeted discovery requests` · `They haven't responded — options?`

**Settlement context:** `Draft a Rule 408 letter` · `Where's my leverage?` ·
`Log a settlement communication`

**Cold-start phase chips** (for completeness; each phase gets its gate chip):
`Tell my story` · `Upload evidence` · `Show my claim options` · `Run the
viability check` · `Prepare pre-suit letters` · `Pick my court` · `Draft the
complaint` · `Build my filing packet` · `Set up service`

## 5. Meta-Loop Integration

Every Drafting Studio / Response Generator task runs Intake → Clarify →
Verify → Outline → Draft → Pressure-Test → Memory-Update, streamed as visible
step states. Reactive-specific notes:

- **Intake** loads the docket ledger + the triggering filing, not just the case profile.
- **Verify** runs against the Authority Bank first (cache), then primary sources.
- **Outline** for oppositions mirrors the opposing motion's structure.
- **Pressure-Test** for oppositions = "what will their reply say"; for motions = "how does the court deny this."
- **Memory-Update** appends to the docket ledger, deadline engine, asset index, and timeline in one transaction.

## 6. Open Questions for the Owner

1. Does Blueprint v1.0's module list differ from §2 above (names, count, scope)?
2. Blueprint §4 may define guardrail behaviors more precisely (e.g., is the
   factual-consistency check blocking or advisory?). Current assumption:
   caption/signature/verification/banned-vocab are **blocking**; tone and
   factual-consistency **flag with one-click fix**, deadline margin is
   **automatic**. Confirm or correct.
3. Does the real chip library (§8) include chips not derivable from the case
   analysis (e.g., appeals, hearings preparation)? Appeals and hearing-prep are
   currently **out of scope** — confirm.
