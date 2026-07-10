import { CaseType } from '@/contexts/types';

/**
 * Generates a descriptive case title from the user's first two intake responses.
 * Called automatically after the second user reply so we have enough signal.
 *
 * `userResponses` are the raw content strings the user sent (nextStep label or typed text).
 */
export function generateCaseTitle(caseType: CaseType, userResponses: string[]): string {
  const first = (userResponses[0] ?? '').toLowerCase();
  const second = (userResponses[1] ?? '').toLowerCase();

  switch (caseType) {
    case 'general': {
      // Turn 1: what's happening  |  Turn 2: who's on the other side
      let situation: string;
      if (first.includes('suing me') || first.includes('defendant') || first.includes('served'))
        situation = 'Lawsuit Defense';
      else if (first.includes('take someone') || first.includes('want to sue') || first.includes('file'))
        situation = 'Civil Claim';
      else if (first.includes('court order') || first.includes('order'))
        situation = 'Court Order Response';
      else
        situation = 'Civil Matter';

      let opponent = '';
      if (second.includes('company') || second.includes('business') || second.includes('employer'))
        opponent = ' vs. Company';
      else if (second.includes('government') || second.includes('agency') || second.includes('official'))
        opponent = ' vs. Government';
      else if (second.includes('person') || second.includes('individual'))
        opponent = ' vs. Individual';
      else if (second.includes('multiple') || second.includes('more than one'))
        opponent = ' – Multiple Parties';

      return situation + opponent;
    }

    case 'fcra': {
      // Turn 1: which bureau  |  Turn 2: what kind of error
      let bureau: string;
      if (first.includes('all three') || first.includes('all 3'))
        bureau = 'All 3 Bureaus';
      else if (first.includes('equifax'))
        bureau = 'Equifax';
      else if (first.includes('experian'))
        bureau = 'Experian';
      else if (first.includes('transunion'))
        bureau = 'TransUnion';
      else
        bureau = 'Credit Bureau';

      let error = '';
      if (second.includes("isn't mine") || second.includes('not mine') || second.includes('identity') || second.includes('mix-up'))
        error = ' – Fraudulent Account';
      else if (second.includes('wrong balance') || second.includes('payment status') || second.includes('owe more') || second.includes('late'))
        error = ' – Incorrect Balance';
      else if (second.includes('reappearing') || second.includes('old debt') || second.includes('re-ag'))
        error = ' – Old Debt Re-aging';
      else if (second.includes('duplicate') || second.includes('more than once'))
        error = ' – Duplicate Account';

      return bureau + ' Credit Dispute' + error;
    }

    case 'traffic': {
      // Turn 1: what offense  |  Turn 2: what state
      let offense: string;
      if (first.includes('speeding') || first.includes('speed'))
        offense = 'Speeding Ticket';
      else if (first.includes('red light') || first.includes('stop sign') || first.includes('stop'))
        offense = 'Red Light Ticket';
      else if (first.includes('insurance') || first.includes('registration') || first.includes('paperwork'))
        offense = 'Insurance / Registration Violation';
      else
        offense = 'Traffic Ticket';

      let state = '';
      if (second.includes('california')) state = ' – California';
      else if (second.includes('texas')) state = ' – Texas';
      else if (second.includes('florida')) state = ' – Florida';
      else if (second.includes('new york')) state = ' – New York';
      // "a different state" — no suffix, enough context from offense

      return offense + state;
    }

    case 'ifp': {
      // Turn 1: household size  |  Turn 2: monthly income — enough for a useful title
      let size = '';
      if (first.includes('just me') || first.includes('1 person')) size = 'Single';
      else if (first.includes('2 people') || first.includes('one other')) size = 'Family of 2';
      else if (first.includes('3') || first.includes('4')) size = 'Family of 3–4';
      else if (first.includes('5') || first.includes('more')) size = 'Larger Household';

      return size ? `Fee Waiver Application – ${size}` : 'Fee Waiver Application';
    }

    default:
      return 'New Case';
  }
}
