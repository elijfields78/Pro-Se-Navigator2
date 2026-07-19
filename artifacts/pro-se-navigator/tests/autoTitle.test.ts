/** Hardening cycle 13: coverage for the auto-title generator — previously
 *  untested despite naming every case in the UI. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateCaseTitle } from '../utils/autoTitle';

test('general: situation + opponent composition', () => {
  assert.equal(
    generateCaseTitle('general', ["Someone is suing me", 'A company or business']),
    'Lawsuit Defense vs. Company',
  );
  assert.equal(
    generateCaseTitle('general', ['I got a court order', 'A person']),
    'Court Order Response vs. Individual',
  );
  assert.equal(generateCaseTitle('general', ['something else', 'someone']), 'Civil Matter');
});

test('fcra: bureau + error composition', () => {
  assert.equal(
    generateCaseTitle('fcra', ['Equifax', "This account isn't mine"]),
    'Equifax Credit Dispute – Fraudulent Account',
  );
  assert.equal(
    generateCaseTitle('fcra', ['All three bureaus', 'wrong balance shown']),
    'All 3 Bureaus Credit Dispute – Incorrect Balance',
  );
});

test('traffic and ifp fall back sensibly', () => {
  assert.equal(generateCaseTitle('traffic', ['speeding', 'texas']), 'Speeding Ticket – Texas');
  assert.equal(generateCaseTitle('traffic', [], ), 'Traffic Ticket');
  assert.equal(generateCaseTitle('ifp', ['just me', '']), 'Fee Waiver Application – Single');
  assert.equal(generateCaseTitle('ifp', ['', '']), 'Fee Waiver Application');
});

test('handles empty and missing responses without throwing', () => {
  assert.equal(generateCaseTitle('general', []), 'Civil Matter');
  assert.doesNotThrow(() => generateCaseTitle('fcra', []));
});
