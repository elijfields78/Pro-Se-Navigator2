import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lookupDeadlineRule } from '../lib/deadlineRules';

test('answer-to-complaint outranks the broader "complaint" keyword', () => {
  const rule = lookupDeadlineRule("Defendant's Answer to Complaint", 'form');
  assert.equal(rule.estimatedDays, 21);
  assert.equal(rule.description, "Defendant's answer to complaint");
});

test('a complaint maps to the 21-day answer deadline', () => {
  const rule = lookupDeadlineRule('Verified Complaint', 'form');
  assert.equal(rule.estimatedDays, 21);
  assert.equal(rule.ruleBasis, 'Fed. R. Civ. P. 12(a)(1)(A)(i)');
});

test('motion to dismiss maps to the 14-day opposition window', () => {
  const rule = lookupDeadlineRule('Motion to Dismiss under Rule 12(b)(6)', 'motion');
  assert.equal(rule.estimatedDays, 14);
});

test('matching is case-insensitive', () => {
  const rule = lookupDeadlineRule('NOTICE OF APPEAL', 'form');
  assert.equal(rule.estimatedDays, 30);
  assert.equal(rule.ruleBasis, 'Fed. R. App. P. 4(a)(1)(A)');
});

test('FCRA dispute letter maps to the 30-day reinvestigation window', () => {
  const rule = lookupDeadlineRule('Credit Report Dispute Letter', 'letter');
  assert.equal(rule.estimatedDays, 30);
  assert.match(rule.ruleBasis, /1681i/);
});

test('unknown title falls back to the artifact-kind default', () => {
  const rule = lookupDeadlineRule('Untitled document', 'letter');
  assert.equal(rule.estimatedDays, 30);
  assert.equal(rule.triggerDateLabel, 'date the letter was sent or received');
});
