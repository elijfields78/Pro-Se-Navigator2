import { CaseType, NextStep } from '@/contexts/types';

export interface IntakeTurn {
  message: string;
  nextSteps: NextStep[];
}

export const WRAP_UP_MESSAGE =
  `Thanks — that's enough to get started.\n\nI now have a picture of your situation. From here I can help you figure out next steps, understand what documents matter, and prepare what you need to file or respond.\n\nWhat would you like to do first?`;

// ── Document type options ─────────────────────────────────────────────────────
// Shown when the user asks to draft something. Each option creates a stub
// artifact and immediately triggers the deadline calculation flow.
export const DRAFT_TYPE_NEXT_STEPS: NextStep[] = [
  {
    id: 'draft_answer',
    label: "Defendant's Answer",
    subtitle: 'Response to a complaint',
    action: 'create_draft',
    actionData: { title: "Defendant's Answer", kind: 'motion' },
  },
  {
    id: 'draft_complaint',
    label: 'Verified Complaint',
    subtitle: 'To initiate a lawsuit',
    action: 'create_draft',
    actionData: { title: 'Verified Complaint', kind: 'motion' },
  },
  {
    id: 'draft_motion_dismiss',
    label: 'Motion to Dismiss',
    subtitle: 'Challenge the complaint or counts',
    action: 'create_draft',
    actionData: { title: 'Motion to Dismiss', kind: 'motion' },
  },
  {
    id: 'draft_dispute_letter',
    label: 'Dispute Letter',
    subtitle: 'Credit report or debt dispute (FCRA)',
    action: 'create_draft',
    actionData: { title: 'Dispute Letter', kind: 'letter' },
  },
  {
    id: 'draft_motion_other',
    label: 'Other Motion or Pleading',
    subtitle: 'Injunction, opposition, summary judgment…',
    action: 'create_draft',
    actionData: { title: 'Motion', kind: 'motion' },
  },
];

const DRAFT_FOLLOW_UP_PROMPT =
  `What type of document are you working on?\n\nI'll create a placeholder draft and calculate the filing deadline using Federal Rule 6.\n\n(Full AI drafting arrives in Phase 6 — the deadline calculation works right now.)`;

export const WRAP_UP_NEXT_STEPS: NextStep[] = [
  { id: 'what_happens_next', label: 'What happens next in my case?', subtitle: 'Walk me through the process' },
  { id: 'check_deadlines', label: 'Do I have any deadlines?', subtitle: 'Important dates to know' },
  {
    id: 'draft_something',
    label: 'Help me write something',
    subtitle: 'Letter, response, or form',
    followUpPrompt: DRAFT_FOLLOW_UP_PROMPT,
    followUpNextSteps: DRAFT_TYPE_NEXT_STEPS,
  },
  { id: 'explain_options', label: 'What are my options?', subtitle: 'Explain what I can do' },
];

export const POST_INTAKE_RESPONSE =
  `Got it — I've noted that.\n\nFull document drafting and legal research will be available once the system is connected. Everything you've told me is saved and we'll build on it.\n\nIs there a specific deadline or document you're concerned about right now?`;

export const POST_INTAKE_NEXT_STEPS: NextStep[] = [
  { id: 'has_deadline', label: 'Yes — I have a deadline coming up', subtitle: 'Tell me about it' },
  {
    id: 'need_to_draft',
    label: 'I need to write something',
    subtitle: 'Letter, response, or form',
    followUpPrompt: DRAFT_FOLLOW_UP_PROMPT,
    followUpNextSteps: DRAFT_TYPE_NEXT_STEPS,
  },
  { id: 'want_research', label: 'Help me understand my rights', subtitle: '' },
  { id: 'nothing_urgent', label: 'Nothing urgent right now', subtitle: '' },
];

const intakeScripts: Record<CaseType, IntakeTurn[]> = {

  // ─── GENERAL CIVIL ───────────────────────────────────────────────────────────
  general: [
    {
      message: `Welcome. I'm your Navigator.\n\nI'll walk you through this one step at a time — no legal background needed. Everything you tell me stays private to this case.\n\nFirst, tell me what's happening. What's the situation?`,
      nextSteps: [
        { id: 'was_sued', label: 'Someone is suing me', subtitle: 'I was served papers or got a notice' },
        { id: 'want_to_sue', label: 'I want to take someone to court', subtitle: 'I have a dispute or was wronged' },
        { id: 'got_order', label: 'I received a court order', subtitle: 'Something I need to respond to' },
        { id: 'not_sure_yet', label: "I'm not sure what to do yet", subtitle: 'I want to understand my options' },
      ],
    },
    {
      message: `Got it.\n\nNow let's figure out where your case belongs. You don't need to know this — that's what I'm here for. I'll ask a few quick questions.\n\nWho is on the other side of this dispute?`,
      nextSteps: [
        { id: 'another_person', label: 'Another person', subtitle: 'Neighbor, landlord, someone I know, etc.' },
        { id: 'a_company', label: 'A company or business', subtitle: 'Employer, store, bank, insurance, etc.' },
        { id: 'government', label: 'A government agency or official', subtitle: 'City, state, police, IRS, etc.' },
        { id: 'multiple', label: 'More than one party', subtitle: '' },
      ],
    },
    {
      message: `Helpful — thank you.\n\nHere's something that matters for figuring out which court applies: are you and the other party in the same state, or different states?`,
      nextSteps: [
        { id: 'same_state', label: 'Same state as me', subtitle: "We're both in the same state" },
        { id: 'diff_state', label: 'Different state from me', subtitle: 'They live or operate elsewhere' },
        { id: 'company_unsure', label: "It's a company — I'm not sure where they're based", subtitle: 'I can help you find out' },
        { id: 'dont_know_location', label: "I don't know", subtitle: "That's okay — we'll work through it" },
      ],
    },
    {
      message: `One more question to figure out the right court for your situation.\n\nApproximately how much money or value is involved? If it's not about money, pick the last option.\n\nThis matters because it determines whether your case goes to small claims court, state court, or federal court.`,
      nextSteps: [
        { id: 'under_10k', label: 'Under $10,000', subtitle: 'Might qualify for small claims' },
        { id: 'btw_10k_75k', label: '$10,000 – $75,000', subtitle: 'Likely state court' },
        { id: 'over_75k', label: 'More than $75,000', subtitle: 'May be eligible for federal court' },
        { id: 'not_money', label: "It's not about money", subtitle: 'I want a court order to stop something' },
      ],
    },
  ],

  // ─── FCRA / CREDIT REPORT ────────────────────────────────────────────────────
  fcra: [
    {
      message: `I'll help you fix what's on your credit report.\n\nThe law that protects you is called the Fair Credit Reporting Act (FCRA). It gives you the right to dispute errors — and if the bureaus don't fix them, you can sue.\n\nLet's start simple: which credit bureaus are showing the problem? You can pick more than one.`,
      nextSteps: [
        { id: 'equifax', label: 'Equifax', subtitle: '' },
        { id: 'experian', label: 'Experian', subtitle: '' },
        { id: 'transunion', label: 'TransUnion', subtitle: '' },
        { id: 'all_three', label: 'All three of them', subtitle: '' },
        { id: 'all_three_plus', label: 'All three — and the company reporting it', subtitle: 'e.g. Navy Federal, Capital One, a debt collector' },
        { id: 'not_sure_bureau', label: "I'm not sure which ones", subtitle: "That's okay — I'll show you how to check" },
      ],
    },
    {
      message: `Okay. Now tell me what's wrong on the report.\n\nDon't worry about legal terms — just describe what you see that shouldn't be there, or what's wrong about it.`,
      nextSteps: [
        { id: 'not_mine', label: "An account that isn't mine", subtitle: 'Could be identity theft or a mix-up' },
        { id: 'wrong_balance', label: 'Wrong balance or payment status', subtitle: "It says I owe more than I do, or I paid but it still shows late" },
        { id: 'old_debt', label: 'Old debt that keeps reappearing', subtitle: "It should have dropped off by now" },
        { id: 'duplicate', label: 'The same debt shows up more than once', subtitle: '' },
        { id: 'other_error', label: 'Something else', subtitle: 'I can describe it' },
      ],
    },
    {
      message: `Good. Have you tried disputing this before — either online, by mail, or by phone?`,
      nextSteps: [
        { id: 'never_disputed', label: "No, this is my first time", subtitle: "I'll walk you through Step 1" },
        { id: 'disputed_verified', label: "Yes — they said it was 'verified' but it's still wrong", subtitle: 'Time for Step 2' },
        { id: 'no_response', label: "Yes — and they never responded", subtitle: 'They had 30 days — that may be a violation' },
        { id: 'partial_fix', label: "Yes — they fixed part of it but not all", subtitle: '' },
      ],
    },
    {
      message: `Last question: do you have a copy of your credit report?\n\nIf yes, I can use it to build a stronger dispute letter. If not, I'll tell you exactly how to get a free one — it only takes a few minutes.`,
      nextSteps: [
        { id: 'have_report', label: "Yes, I have it", subtitle: "I can upload it or describe what I see" },
        { id: 'need_report', label: "I need to get one first", subtitle: "Free at AnnualCreditReport.com — takes 5 minutes" },
        { id: 'proceed_without', label: "Walk me through it without the report", subtitle: '' },
      ],
    },
  ],

  // ─── TRAFFIC TICKET ──────────────────────────────────────────────────────────
  traffic: [
    {
      message: `Let's work through your ticket together.\n\nThe most important thing is to act before your court date — even just showing up prepared gives you a much better chance.\n\nWhat does the ticket say you did?`,
      nextSteps: [
        { id: 'speeding', label: 'Speeding', subtitle: 'Going over the posted limit' },
        { id: 'red_light_stop', label: 'Red light or stop sign', subtitle: 'Ran it or rolled through it' },
        { id: 'no_insurance', label: 'No insurance or registration', subtitle: 'Paperwork violation' },
        { id: 'other_violation', label: 'Something else', subtitle: "I have the ticket — I can read it to you" },
      ],
    },
    {
      message: `Got it. Now I need to figure out which court you'll go to — and the rules are different depending on where this happened.\n\nWhat state did you get this ticket in?`,
      nextSteps: [
        { id: 'state_california', label: 'California', subtitle: '' },
        { id: 'state_texas', label: 'Texas', subtitle: '' },
        { id: 'state_florida', label: 'Florida', subtitle: '' },
        { id: 'state_new_york', label: 'New York', subtitle: '' },
        {
          id: 'state_other',
          label: 'A different state',
          subtitle: "I'll tell you which one",
          followUpPrompt: "No problem — which state was the ticket in?\n\nJust type it in and I'll look up the rules that apply.",
        },
      ],
    },
    {
      message: `Good. Does the ticket show a court date, or do you need to contact the court to schedule one?`,
      nextSteps: [
        { id: 'date_on_ticket', label: 'There is a date on the ticket', subtitle: 'I know when I need to appear' },
        { id: 'need_to_contact', label: 'I need to contact the court', subtitle: "I'll tell you how to do that" },
        { id: 'paid_already', label: 'I already paid the fine', subtitle: 'But I want to see if I can still fight it' },
        { id: 'not_sure', label: "I'm not sure", subtitle: 'I can look at the ticket together with you' },
      ],
    },
    {
      message: `Have you entered a plea yet — meaning, have you officially told the court whether you're guilty or not guilty?`,
      nextSteps: [
        { id: 'no_plea_yet', label: "No — I haven't done anything yet", subtitle: "Good, we have options" },
        { id: 'pleaded_not_guilty', label: 'I already pleaded not guilty', subtitle: "Good — let's prepare for your hearing" },
        { id: 'pleaded_guilty', label: 'I pleaded guilty or paid it', subtitle: 'I want to see if I can undo that' },
        { id: 'traffic_school', label: 'I was offered traffic school', subtitle: 'Wondering if I should take it' },
      ],
    },
  ],

  // ─── FEE WAIVER (IFP) ────────────────────────────────────────────────────────
  ifp: [
    {
      message: `I'll help you apply to have your court filing fees waived — this is called an "IFP application" or proceeding "in forma pauperis."\n\nPlain English: if you can't afford the fees, you can ask the court to let you file for free. Courts grant these regularly. You just have to document your situation honestly.\n\nLet's start: how many people depend on your income, including yourself?`,
      nextSteps: [
        { id: 'hh_1', label: 'Just me', subtitle: '1 person' },
        { id: 'hh_2', label: 'Me and one other person', subtitle: '2 people' },
        { id: 'hh_3_4', label: 'Me and 2–3 others', subtitle: '3–4 people total' },
        { id: 'hh_5plus', label: 'Me and 4 or more others', subtitle: '5+ people total' },
      ],
    },
    {
      message: `Got it.\n\nWhat's your approximate monthly income from all sources? Include any jobs, benefits, support payments, or anything else that comes in.`,
      nextSteps: [
        { id: 'inc_under1k', label: 'Under $1,000 / month', subtitle: '' },
        { id: 'inc_1k_2_5k', label: '$1,000 – $2,500 / month', subtitle: '' },
        { id: 'inc_2_5k_4k', label: '$2,500 – $4,000 / month', subtitle: '' },
        { id: 'inc_over4k', label: 'Over $4,000 / month', subtitle: '' },
      ],
    },
    {
      message: `Do you currently receive any government benefits? These can actually help your application — courts see them as a sign that your income has already been verified by another agency.`,
      nextSteps: [
        { id: 'snap_medicaid', label: 'SNAP (food stamps) or Medicaid', subtitle: 'Many courts automatically qualify you' },
        { id: 'ssi_ssdi', label: 'SSI or SSDI (disability benefits)', subtitle: '' },
        { id: 'other_benefits', label: 'Other government assistance', subtitle: 'Housing, WIC, TANF, etc.' },
        { id: 'no_benefits', label: 'None of these', subtitle: '' },
      ],
    },
    {
      message: `Last question: roughly what are your monthly expenses? Include rent or mortgage, food, utilities, medical costs, child care — anything you pay regularly.\n\nBallpark is fine. The point is to show the court your actual financial picture.`,
      nextSteps: [
        { id: 'exp_under1k', label: 'Under $1,000 / month', subtitle: '' },
        { id: 'exp_1k_2k', label: '$1,000 – $2,000 / month', subtitle: '' },
        { id: 'exp_2k_3k', label: '$2,000 – $3,000 / month', subtitle: '' },
        { id: 'exp_over3k', label: 'Over $3,000 / month', subtitle: '' },
      ],
    },
  ],
};

export default intakeScripts;
