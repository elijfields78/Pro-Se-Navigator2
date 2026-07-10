import { CaseType, NextStep } from '@/contexts/types';

export interface IntakeTurn {
  message: string;
  nextSteps: NextStep[];
}

export const WRAP_UP_MESSAGE =
  `Thank you — I have what I need to organize this case.\n\nFrom here I can help you track deadlines, review verified legal authorities, and — when you're ready — draft filings. Everything I draft will be cross-checked against primary sources before you see it.\n\nWhat would you like to work on first?`;

export const WRAP_UP_NEXT_STEPS: NextStep[] = [
  { id: 'upload_doc', label: 'Upload a document', subtitle: 'Add evidence or a court filing' },
  { id: 'check_deadlines', label: 'Check my deadlines', subtitle: 'See what\'s coming up' },
  { id: 'draft_something', label: 'Draft something', subtitle: 'Letter, motion, or form' },
  { id: 'explain_options', label: 'Explain my options', subtitle: 'Walk me through what I can do' },
];

export const POST_INTAKE_RESPONSE =
  `Noted. I've recorded that with your case.\n\nFull AI-assisted analysis and drafting will be available once your account is connected to the research and verification system. Your intake answers are saved and we'll build on them.\n\nIs there a specific deadline or document you're concerned about right now?`;

export const POST_INTAKE_NEXT_STEPS: NextStep[] = [
  { id: 'has_deadline', label: 'Yes — I have a deadline', subtitle: 'Tell me about it' },
  { id: 'need_to_draft', label: 'I need to draft something', subtitle: 'Letter, motion, or form' },
  { id: 'want_research', label: 'Research my legal options', subtitle: '' },
  { id: 'nothing_urgent', label: 'Nothing urgent right now', subtitle: '' },
];

const intakeScripts: Record<CaseType, IntakeTurn[]> = {
  general: [
    {
      message: `Good morning. I'm your Navigator.\n\nI'm here to help you organize this case, understand your rights, and prepare what you need — without the guesswork.\n\nTo start: what's happening? Tell me about the situation.`,
      nextSteps: [
        { id: 'was_sued', label: 'I was served with a lawsuit', subtitle: 'Defendant — I need to respond' },
        { id: 'want_to_sue', label: 'I want to file a lawsuit', subtitle: 'Plaintiff — asserting a claim' },
        { id: 'responding_motion', label: 'Responding to a motion or order', subtitle: '' },
        { id: 'exploring', label: 'Exploring my options', subtitle: 'No filing yet' },
      ],
    },
    {
      message: `Got it. What court is this matter in — or where would you file?`,
      nextSteps: [
        { id: 'federal', label: 'Federal district court', subtitle: '' },
        { id: 'state', label: 'State court', subtitle: '' },
        { id: 'small_claims', label: 'Small claims court', subtitle: '' },
        { id: 'not_sure_court', label: 'I\'m not sure yet', subtitle: 'We can figure this out' },
      ],
    },
    {
      message: `Who is on the other side?`,
      nextSteps: [
        { id: 'individual', label: 'An individual person', subtitle: '' },
        { id: 'company', label: 'A company or business', subtitle: '' },
        { id: 'government', label: 'A government agency', subtitle: '' },
        { id: 'multiple_parties', label: 'Multiple parties', subtitle: '' },
      ],
    },
    {
      message: `What outcome are you working toward?`,
      nextSteps: [
        { id: 'damages', label: 'Money damages', subtitle: '' },
        { id: 'injunction', label: 'A court order to stop something', subtitle: 'Injunctive relief' },
        { id: 'reverse_decision', label: 'Reverse a decision against me', subtitle: '' },
        { id: 'other_outcome', label: 'Something else', subtitle: '' },
      ],
    },
  ],

  fcra: [
    {
      message: `I'll help you assert your rights under the Fair Credit Reporting Act — 15 U.S.C. § 1681.\n\nThe process has three steps: dispute letters to the bureaus, then letters to the furnisher, then — if they don't correct it — a federal complaint. Every citation we use will be verified against a primary source before it appears in any document.\n\nLet's start with your credit report. Which bureaus are reporting the problem?`,
      nextSteps: [
        { id: 'equifax', label: 'Equifax', subtitle: '' },
        { id: 'experian', label: 'Experian', subtitle: '' },
        { id: 'transunion', label: 'TransUnion', subtitle: '' },
        { id: 'all_three', label: 'All three', subtitle: 'Cross-bureau dispute' },
      ],
    },
    {
      message: `What kind of errors are you seeing? Describe what's on the report that shouldn't be there — or what's wrong about what is there.`,
      nextSteps: [
        { id: 'not_mine', label: 'Account that isn\'t mine', subtitle: 'Identity or mixed-file error' },
        { id: 'wrong_balance', label: 'Wrong balance or payment status', subtitle: '' },
        { id: 'reaging', label: 'Old debt reappearing', subtitle: 'Re-aging' },
        { id: 'duplicate', label: 'Duplicate entries', subtitle: '' },
      ],
    },
    {
      message: `Do you have a copy of the credit report? I can extract the tradelines and flag the specific violations.\n\nYou can upload a PDF or image — it stays private to this case.`,
      nextSteps: [
        { id: 'upload_report', label: 'Upload the report now', subtitle: '' },
        { id: 'get_report', label: 'I need to get a copy first', subtitle: 'Free at AnnualCreditReport.com' },
        { id: 'no_report', label: 'Walk me through without the report', subtitle: '' },
      ],
    },
    {
      message: `Has the bureau or furnisher responded to any prior dispute you've filed?`,
      nextSteps: [
        { id: 'first_dispute', label: 'This is my first dispute', subtitle: 'Starting Step 1' },
        { id: 'verified_wrong', label: 'They said "verified" but it\'s still wrong', subtitle: 'Step 2 or complaint' },
        { id: 'no_response', label: 'They didn\'t respond within 30 days', subtitle: 'Potential § 1681i violation' },
        { id: 'partial_fix', label: 'Partially corrected', subtitle: '' },
      ],
    },
  ],

  traffic: [
    {
      message: `Let's build a defense. The goal is to find the weakest link in the prosecution's case — whether that's identity, speed measurement, officer procedure, or signage.\n\nStart with the citation. What was the alleged offense?`,
      nextSteps: [
        { id: 'speeding', label: 'Speeding', subtitle: 'Speed-related violation' },
        { id: 'red_light', label: 'Red light or stop sign', subtitle: 'Signal or sign violation' },
        { id: 'other_moving', label: 'Other moving violation', subtitle: '' },
        { id: 'have_ticket', label: 'I have the ticket', subtitle: 'Let me read it to you' },
      ],
    },
    {
      message: `Where and when did this happen? Jurisdiction determines available defenses and which court you'll appear in.`,
      nextSteps: [
        { id: 'state_road', label: 'State road or highway', subtitle: '' },
        { id: 'city_street', label: 'City street', subtitle: '' },
        { id: 'freeway', label: 'Freeway / interstate', subtitle: '' },
        { id: 'check_ticket', label: 'Let me check the ticket', subtitle: '' },
      ],
    },
    {
      message: `For speed cases: how was speed measured?`,
      nextSteps: [
        { id: 'radar', label: 'Radar', subtitle: '' },
        { id: 'lidar', label: 'Lidar / laser', subtitle: '' },
        { id: 'pacing', label: 'Officer pacing', subtitle: 'Following behind me' },
        { id: 'not_speed_case', label: 'Not a speed case', subtitle: 'Skip this' },
      ],
    },
    {
      message: `Have you entered a plea yet?`,
      nextSteps: [
        { id: 'no_plea', label: 'Not yet — I want to fight it', subtitle: 'Not guilty plea guidance' },
        { id: 'already_not_guilty', label: 'I already pleaded not guilty', subtitle: 'Trial preparation' },
        { id: 'deciding', label: 'I\'m deciding whether to contest', subtitle: 'Help me evaluate my chances' },
      ],
    },
  ],

  ifp: [
    {
      message: `I'll help you prepare a fee waiver application — formally called proceeding in forma pauperis, or IFP — under 28 U.S.C. § 1915.\n\nImportant: courts grant these based on discretion, not a fixed income cutoff. Thorough, honest documentation matters more than the dollar amount.\n\nHow many people depend on your income, including yourself?`,
      nextSteps: [
        { id: 'hh_1', label: '1 person', subtitle: 'Just me' },
        { id: 'hh_2', label: '2 people', subtitle: '' },
        { id: 'hh_3_4', label: '3–4 people', subtitle: '' },
        { id: 'hh_5plus', label: '5 or more', subtitle: '' },
      ],
    },
    {
      message: `What is your approximate monthly income from all sources — employment, benefits, support payments, anything?`,
      nextSteps: [
        { id: 'inc_under1k', label: 'Under $1,000 / month', subtitle: '' },
        { id: 'inc_1k_2_5k', label: '$1,000 – $2,500 / month', subtitle: '' },
        { id: 'inc_2_5k_4k', label: '$2,500 – $4,000 / month', subtitle: '' },
        { id: 'inc_over4k', label: 'Over $4,000 / month', subtitle: '' },
      ],
    },
    {
      message: `Do you currently receive any public benefits?`,
      nextSteps: [
        { id: 'snap_medicaid', label: 'SNAP (food stamps) or Medicaid', subtitle: 'Presumptively eligible in many courts' },
        { id: 'ssi_ssdi', label: 'SSI or SSDI', subtitle: '' },
        { id: 'no_benefits', label: 'No public benefits', subtitle: '' },
        { id: 'multiple_benefits', label: 'Multiple programs', subtitle: '' },
      ],
    },
    {
      message: `Finally: what are your approximate monthly expenses? Include rent, food, utilities, medical, child care — anything regular.\n\nBallpark figures are fine. Accuracy matters more than precision.`,
      nextSteps: [
        { id: 'exp_under1k', label: 'Under $1,000 / month', subtitle: '' },
        { id: 'exp_1k_2k', label: '$1,000 – $2,000 / month', subtitle: '' },
        { id: 'exp_2k_3k', label: '$2,000 – $3,000 / month', subtitle: '' },
        { id: 'exp_over3k', label: 'More than $3,000 / month', subtitle: '' },
      ],
    },
  ],
};

export default intakeScripts;
