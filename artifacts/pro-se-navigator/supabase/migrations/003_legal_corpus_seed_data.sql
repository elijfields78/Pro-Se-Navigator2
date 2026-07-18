-- ============================================================
-- Pro Se Navigator — Phase 5a seed data (run AFTER 002_legal_corpus.sql)
-- Paste into Supabase SQL Editor and run once. Idempotent: safe to re-run.
-- Uses plain sequential statements (not nested CTEs) so execution order
-- is unambiguous when pasted and run as a batch.
-- ============================================================

-- Fed. R. Civ. P. 6
insert into legal_sources (title, citation, url, jurisdiction, source_type, case_types)
values ('Federal Rules of Civil Procedure, Rule 6 — Computing and Extending Time', 'Fed. R. Civ. P. 6', 'https://www.law.cornell.edu/rules/frcp/rule_6', 'federal', 'rule', ARRAY['general', 'fcra', 'ifp']::text[])
on conflict (citation) do update set
  title = excluded.title, url = excluded.url, jurisdiction = excluded.jurisdiction,
  source_type = excluded.source_type, case_types = excluded.case_types;

delete from legal_chunks where source_id = (select id from legal_sources where citation = 'Fed. R. Civ. P. 6');

insert into legal_chunks (source_id, heading, content)
values
  ((select id from legal_sources where citation = 'Fed. R. Civ. P. 6'), 'Rule 6(a) — Computing time', 'When a period is stated in days, exclude the day of the triggering event, count every intervening day including weekends and holidays, and include the last day. If the last day falls on a Saturday, Sunday, or legal holiday, the period continues to run until the end of the next day that is not a Saturday, Sunday, or legal holiday.'),
  ((select id from legal_sources where citation = 'Fed. R. Civ. P. 6'), 'Rule 6(b) — Extending time', 'The court may, for good cause, extend the time to act. A request made before the original deadline may be granted with or without motion; a request made after the deadline requires a showing of excusable neglect. Certain deadlines (for example, motions under Rules 50, 52, 59, and 60) cannot be extended.'),
  ((select id from legal_sources where citation = 'Fed. R. Civ. P. 6'), 'Rule 6(d) — Additional 3 days after certain kinds of service', 'When a party may or must act within a specified time after being served, 3 days are added after the period would otherwise end if service was made by mail or certain other means under Rule 5(b)(2)(C), (D), or (F). Electronic service does not add these 3 days.');

-- Fed. R. Civ. P. 8
insert into legal_sources (title, citation, url, jurisdiction, source_type, case_types)
values ('Federal Rules of Civil Procedure, Rule 8 — General Rules of Pleading', 'Fed. R. Civ. P. 8', 'https://www.law.cornell.edu/rules/frcp/rule_8', 'federal', 'rule', ARRAY['general', 'fcra', 'ifp']::text[])
on conflict (citation) do update set
  title = excluded.title, url = excluded.url, jurisdiction = excluded.jurisdiction,
  source_type = excluded.source_type, case_types = excluded.case_types;

delete from legal_chunks where source_id = (select id from legal_sources where citation = 'Fed. R. Civ. P. 8');

insert into legal_chunks (source_id, heading, content)
values
  ((select id from legal_sources where citation = 'Fed. R. Civ. P. 8'), 'Rule 8(a) — Claim for relief', 'A pleading that states a claim for relief must contain a short and plain statement of the grounds for the court''s jurisdiction, a short and plain statement of the claim showing the pleader is entitled to relief, and a demand for the relief sought, which may include alternative or different types of relief.'),
  ((select id from legal_sources where citation = 'Fed. R. Civ. P. 8'), 'Rule 8(b) — Defenses; admissions and denials', 'In responding to a pleading, a party must state its defenses to each claim and admit or deny the allegations. A party that lacks knowledge or information sufficient to form a belief about the truth of an allegation must say so, and that statement has the effect of a denial. An allegation not denied — other than one about the amount of damages — is admitted.');

-- Fed. R. Civ. P. 12
insert into legal_sources (title, citation, url, jurisdiction, source_type, case_types)
values ('Federal Rules of Civil Procedure, Rule 12 — Defenses and Objections', 'Fed. R. Civ. P. 12', 'https://www.law.cornell.edu/rules/frcp/rule_12', 'federal', 'rule', ARRAY['general', 'fcra', 'ifp']::text[])
on conflict (citation) do update set
  title = excluded.title, url = excluded.url, jurisdiction = excluded.jurisdiction,
  source_type = excluded.source_type, case_types = excluded.case_types;

delete from legal_chunks where source_id = (select id from legal_sources where citation = 'Fed. R. Civ. P. 12');

insert into legal_chunks (source_id, heading, content)
values
  ((select id from legal_sources where citation = 'Fed. R. Civ. P. 12'), 'Rule 12(a) — Time to serve a responsive pleading', 'A defendant must serve an answer within 21 days after being served with the summons and complaint. If the defendant timely waived service under Rule 4(d), the answer is due within 60 days after the request for a waiver was sent (90 days if the defendant is outside any U.S. judicial district). Serving a Rule 12 motion alters these periods.'),
  ((select id from legal_sources where citation = 'Fed. R. Civ. P. 12'), 'Rule 12(b) — How to present defenses', 'Every defense to a claim must be asserted in the responsive pleading, but a party may move to dismiss for: (1) lack of subject-matter jurisdiction; (2) lack of personal jurisdiction; (3) improper venue; (4) insufficient process; (5) insufficient service of process; (6) failure to state a claim upon which relief can be granted; and (7) failure to join a required party. A motion asserting these must be made before pleading if a responsive pleading is allowed.'),
  ((select id from legal_sources where citation = 'Fed. R. Civ. P. 12'), 'Rule 12(e) — Motion for a more definite statement', 'A party may move for a more definite statement of a pleading that is so vague or ambiguous that the party cannot reasonably prepare a response. The motion must be made before filing a responsive pleading and must point out the defects and the details desired.');

-- Fed. R. Civ. P. 15
insert into legal_sources (title, citation, url, jurisdiction, source_type, case_types)
values ('Federal Rules of Civil Procedure, Rule 15 — Amended and Supplemental Pleadings', 'Fed. R. Civ. P. 15', 'https://www.law.cornell.edu/rules/frcp/rule_15', 'federal', 'rule', ARRAY['general', 'fcra', 'ifp']::text[])
on conflict (citation) do update set
  title = excluded.title, url = excluded.url, jurisdiction = excluded.jurisdiction,
  source_type = excluded.source_type, case_types = excluded.case_types;

delete from legal_chunks where source_id = (select id from legal_sources where citation = 'Fed. R. Civ. P. 15');

insert into legal_chunks (source_id, heading, content)
values
  ((select id from legal_sources where citation = 'Fed. R. Civ. P. 15'), 'Rule 15(a) — Amendments before trial', 'A party may amend its pleading once as a matter of course within 21 days after serving it, or within 21 days after service of a responsive pleading or a Rule 12(b), (e), or (f) motion, whichever is earlier. Otherwise, a party may amend only with the opposing party''s written consent or the court''s leave, which the court should freely give when justice so requires.');

-- Fed. R. Civ. P. 55
insert into legal_sources (title, citation, url, jurisdiction, source_type, case_types)
values ('Federal Rules of Civil Procedure, Rule 55 — Default; Default Judgment', 'Fed. R. Civ. P. 55', 'https://www.law.cornell.edu/rules/frcp/rule_55', 'federal', 'rule', ARRAY['general', 'fcra']::text[])
on conflict (citation) do update set
  title = excluded.title, url = excluded.url, jurisdiction = excluded.jurisdiction,
  source_type = excluded.source_type, case_types = excluded.case_types;

delete from legal_chunks where source_id = (select id from legal_sources where citation = 'Fed. R. Civ. P. 55');

insert into legal_chunks (source_id, heading, content)
values
  ((select id from legal_sources where citation = 'Fed. R. Civ. P. 55'), 'Rule 55(a)–(b) — Entry of default and default judgment', 'When a party against whom affirmative relief is sought has failed to plead or otherwise defend, and that failure is shown by affidavit or otherwise, the clerk must enter the party''s default. A default judgment may then be entered by the clerk in limited circumstances or, more commonly, by the court on the plaintiff''s application. The court may set aside an entry of default for good cause.');

-- Fed. R. Civ. P. 56
insert into legal_sources (title, citation, url, jurisdiction, source_type, case_types)
values ('Federal Rules of Civil Procedure, Rule 56 — Summary Judgment', 'Fed. R. Civ. P. 56', 'https://www.law.cornell.edu/rules/frcp/rule_56', 'federal', 'rule', ARRAY['general', 'fcra']::text[])
on conflict (citation) do update set
  title = excluded.title, url = excluded.url, jurisdiction = excluded.jurisdiction,
  source_type = excluded.source_type, case_types = excluded.case_types;

delete from legal_chunks where source_id = (select id from legal_sources where citation = 'Fed. R. Civ. P. 56');

insert into legal_chunks (source_id, heading, content)
values
  ((select id from legal_sources where citation = 'Fed. R. Civ. P. 56'), 'Rule 56(a) — Standard for summary judgment', 'The court shall grant summary judgment if the movant shows that there is no genuine dispute as to any material fact and the movant is entitled to judgment as a matter of law. A party may move for summary judgment on a claim or defense, or part of one, and the court should state on the record its reasons for granting or denying the motion.');

-- Fed. R. App. P. 4
insert into legal_sources (title, citation, url, jurisdiction, source_type, case_types)
values ('Federal Rules of Appellate Procedure, Rule 4 — Appeal as of Right: When Taken', 'Fed. R. App. P. 4', 'https://www.law.cornell.edu/rules/frap/rule_4', 'federal', 'rule', ARRAY['general', 'fcra', 'ifp']::text[])
on conflict (citation) do update set
  title = excluded.title, url = excluded.url, jurisdiction = excluded.jurisdiction,
  source_type = excluded.source_type, case_types = excluded.case_types;

delete from legal_chunks where source_id = (select id from legal_sources where citation = 'Fed. R. App. P. 4');

insert into legal_chunks (source_id, heading, content)
values
  ((select id from legal_sources where citation = 'Fed. R. App. P. 4'), 'Rule 4(a)(1) — Time to file a notice of appeal in a civil case', 'In a civil case, the notice of appeal must generally be filed with the district clerk within 30 days after entry of the judgment or order appealed from. When the United States or a federal officer or agency is a party, the deadline is 60 days. Certain post-judgment motions restart the appeal clock, and the court may extend or reopen the time in limited circumstances.');

-- Fed. R. Evid. 401
insert into legal_sources (title, citation, url, jurisdiction, source_type, case_types)
values ('Federal Rules of Evidence, Rule 401 — Test for Relevant Evidence', 'Fed. R. Evid. 401', 'https://www.law.cornell.edu/rules/fre/rule_401', 'federal', 'rule', ARRAY['general', 'fcra', 'traffic']::text[])
on conflict (citation) do update set
  title = excluded.title, url = excluded.url, jurisdiction = excluded.jurisdiction,
  source_type = excluded.source_type, case_types = excluded.case_types;

delete from legal_chunks where source_id = (select id from legal_sources where citation = 'Fed. R. Evid. 401');

insert into legal_chunks (source_id, heading, content)
values
  ((select id from legal_sources where citation = 'Fed. R. Evid. 401'), 'Rule 401 — Relevance defined', 'Evidence is relevant if it has any tendency to make a fact more or less probable than it would be without the evidence, and the fact is of consequence in determining the action. This is a low threshold — relevance concerns whether evidence moves the needle at all, not how much weight it deserves.');

-- Fed. R. Evid. 402
insert into legal_sources (title, citation, url, jurisdiction, source_type, case_types)
values ('Federal Rules of Evidence, Rule 402 — General Admissibility of Relevant Evidence', 'Fed. R. Evid. 402', 'https://www.law.cornell.edu/rules/fre/rule_402', 'federal', 'rule', ARRAY['general', 'fcra', 'traffic']::text[])
on conflict (citation) do update set
  title = excluded.title, url = excluded.url, jurisdiction = excluded.jurisdiction,
  source_type = excluded.source_type, case_types = excluded.case_types;

delete from legal_chunks where source_id = (select id from legal_sources where citation = 'Fed. R. Evid. 402');

insert into legal_chunks (source_id, heading, content)
values
  ((select id from legal_sources where citation = 'Fed. R. Evid. 402'), 'Rule 402 — Relevant evidence generally admissible', 'Relevant evidence is admissible unless the U.S. Constitution, a federal statute, the Federal Rules of Evidence, or other rules prescribed by the Supreme Court provide otherwise. Irrelevant evidence is not admissible.');

-- 15 U.S.C. § 1681c
insert into legal_sources (title, citation, url, jurisdiction, source_type, case_types)
values ('Fair Credit Reporting Act, 15 U.S.C. § 1681c — Requirements Relating to Information Contained in Consumer Reports', '15 U.S.C. § 1681c', 'https://www.law.cornell.edu/uscode/text/15/1681c', 'federal', 'statute', ARRAY['fcra']::text[])
on conflict (citation) do update set
  title = excluded.title, url = excluded.url, jurisdiction = excluded.jurisdiction,
  source_type = excluded.source_type, case_types = excluded.case_types;

delete from legal_chunks where source_id = (select id from legal_sources where citation = '15 U.S.C. § 1681c');

insert into legal_chunks (source_id, heading, content)
values
  ((select id from legal_sources where citation = '15 U.S.C. § 1681c'), '§ 1681c(a) — Time limits on reporting adverse information', 'A consumer reporting agency generally may not report most adverse items after 7 years, including accounts placed for collection, civil suits and judgments, and paid tax liens (measured from the relevant date). Bankruptcy cases may be reported for up to 10 years. Certain exceptions apply for large-dollar credit transactions, employment, and life insurance.');

-- 15 U.S.C. § 1681e
insert into legal_sources (title, citation, url, jurisdiction, source_type, case_types)
values ('Fair Credit Reporting Act, 15 U.S.C. § 1681e — Compliance Procedures', '15 U.S.C. § 1681e', 'https://www.law.cornell.edu/uscode/text/15/1681e', 'federal', 'statute', ARRAY['fcra']::text[])
on conflict (citation) do update set
  title = excluded.title, url = excluded.url, jurisdiction = excluded.jurisdiction,
  source_type = excluded.source_type, case_types = excluded.case_types;

delete from legal_chunks where source_id = (select id from legal_sources where citation = '15 U.S.C. § 1681e');

insert into legal_chunks (source_id, heading, content)
values
  ((select id from legal_sources where citation = '15 U.S.C. § 1681e'), '§ 1681e(b) — Maximum possible accuracy', 'Whenever a consumer reporting agency prepares a consumer report, it must follow reasonable procedures to assure maximum possible accuracy of the information concerning the individual about whom the report relates. Failure to do so is a common basis for FCRA claims when inaccurate information causes harm.');

-- 15 U.S.C. § 1681i
insert into legal_sources (title, citation, url, jurisdiction, source_type, case_types)
values ('Fair Credit Reporting Act, 15 U.S.C. § 1681i — Procedure in Case of Disputed Accuracy', '15 U.S.C. § 1681i', 'https://www.law.cornell.edu/uscode/text/15/1681i', 'federal', 'statute', ARRAY['fcra']::text[])
on conflict (citation) do update set
  title = excluded.title, url = excluded.url, jurisdiction = excluded.jurisdiction,
  source_type = excluded.source_type, case_types = excluded.case_types;

delete from legal_chunks where source_id = (select id from legal_sources where citation = '15 U.S.C. § 1681i');

insert into legal_chunks (source_id, heading, content)
values
  ((select id from legal_sources where citation = '15 U.S.C. § 1681i'), '§ 1681i(a) — Reinvestigation of disputed information', 'When a consumer disputes the completeness or accuracy of an item directly with a consumer reporting agency, the agency must conduct a reasonable reinvestigation to determine whether the disputed information is inaccurate, generally free of charge and within 30 days of receiving the dispute (extendable to 45 days in some circumstances). Information that cannot be verified must be deleted or modified.');

-- 15 U.S.C. § 1681n
insert into legal_sources (title, citation, url, jurisdiction, source_type, case_types)
values ('Fair Credit Reporting Act, 15 U.S.C. § 1681n — Civil Liability for Willful Noncompliance', '15 U.S.C. § 1681n', 'https://www.law.cornell.edu/uscode/text/15/1681n', 'federal', 'statute', ARRAY['fcra']::text[])
on conflict (citation) do update set
  title = excluded.title, url = excluded.url, jurisdiction = excluded.jurisdiction,
  source_type = excluded.source_type, case_types = excluded.case_types;

delete from legal_chunks where source_id = (select id from legal_sources where citation = '15 U.S.C. § 1681n');

insert into legal_chunks (source_id, heading, content)
values
  ((select id from legal_sources where citation = '15 U.S.C. § 1681n'), '§ 1681n — Damages for willful violations', 'Any person who willfully fails to comply with an FCRA requirement with respect to a consumer is liable for actual damages or statutory damages of not less than $100 and not more than $1,000, plus punitive damages the court may allow, and reasonable attorney''s fees and costs.');

-- 15 U.S.C. § 1681o
insert into legal_sources (title, citation, url, jurisdiction, source_type, case_types)
values ('Fair Credit Reporting Act, 15 U.S.C. § 1681o — Civil Liability for Negligent Noncompliance', '15 U.S.C. § 1681o', 'https://www.law.cornell.edu/uscode/text/15/1681o', 'federal', 'statute', ARRAY['fcra']::text[])
on conflict (citation) do update set
  title = excluded.title, url = excluded.url, jurisdiction = excluded.jurisdiction,
  source_type = excluded.source_type, case_types = excluded.case_types;

delete from legal_chunks where source_id = (select id from legal_sources where citation = '15 U.S.C. § 1681o');

insert into legal_chunks (source_id, heading, content)
values
  ((select id from legal_sources where citation = '15 U.S.C. § 1681o'), '§ 1681o — Damages for negligent violations', 'Any person who is negligent in failing to comply with an FCRA requirement with respect to a consumer is liable for the consumer''s actual damages sustained as a result, together with reasonable attorney''s fees and costs as determined by the court.');

-- 28 U.S.C. § 1915
insert into legal_sources (title, citation, url, jurisdiction, source_type, case_types)
values ('Proceedings In Forma Pauperis, 28 U.S.C. § 1915', '28 U.S.C. § 1915', 'https://www.law.cornell.edu/uscode/text/28/1915', 'federal', 'statute', ARRAY['ifp']::text[])
on conflict (citation) do update set
  title = excluded.title, url = excluded.url, jurisdiction = excluded.jurisdiction,
  source_type = excluded.source_type, case_types = excluded.case_types;

delete from legal_chunks where source_id = (select id from legal_sources where citation = '28 U.S.C. § 1915');

insert into legal_chunks (source_id, heading, content)
values
  ((select id from legal_sources where citation = '28 U.S.C. § 1915'), '§ 1915(a) — Proceeding without prepaying fees', 'A federal court may authorize the commencement of a suit without prepayment of fees or costs by a person who submits an affidavit showing that they are unable to pay. The affidavit must state the nature of the action and the affiant''s belief that they are entitled to relief. The court may dismiss the case if the allegation of poverty is untrue or the action is frivolous, malicious, or fails to state a claim.');

-- Verification
select (select count(*) from legal_sources) as source_count, (select count(*) from legal_chunks) as chunk_count;
