/**
 * Phase 5a seed corpus — Federal rules + FCRA.
 *
 * `content` is an app-authored plain-English explanation of each provision,
 * NOT a verbatim quote. The `url` is the canonical primary source (Cornell
 * LII); Phase 7's verification gate confirms any cited proposition against it.
 * Keep explanations accurate and conservative — when in doubt, defer to the URL.
 */

export interface SeedChunk {
  heading: string;
  content: string;
}

export interface SeedSource {
  title: string;
  citation: string;
  url: string;
  jurisdiction: "federal";
  sourceType: "rule" | "statute";
  caseTypes: Array<"general" | "fcra" | "traffic" | "ifp">;
  chunks: SeedChunk[];
}

export const legalCorpusSeed: SeedSource[] = [
  {
    title: "Federal Rules of Civil Procedure, Rule 6 — Computing and Extending Time",
    citation: "Fed. R. Civ. P. 6",
    url: "https://www.law.cornell.edu/rules/frcp/rule_6",
    jurisdiction: "federal",
    sourceType: "rule",
    caseTypes: ["general", "fcra", "ifp"],
    chunks: [
      {
        heading: "Rule 6(a) — Computing time",
        content:
          "When a period is stated in days, exclude the day of the triggering event, count every intervening day including weekends and holidays, and include the last day. If the last day falls on a Saturday, Sunday, or legal holiday, the period continues to run until the end of the next day that is not a Saturday, Sunday, or legal holiday.",
      },
      {
        heading: "Rule 6(b) — Extending time",
        content:
          "The court may, for good cause, extend the time to act. A request made before the original deadline may be granted with or without motion; a request made after the deadline requires a showing of excusable neglect. Certain deadlines (for example, motions under Rules 50, 52, 59, and 60) cannot be extended.",
      },
      {
        heading: "Rule 6(d) — Additional 3 days after certain kinds of service",
        content:
          "When a party may or must act within a specified time after being served, 3 days are added after the period would otherwise end if service was made by mail or certain other means under Rule 5(b)(2)(C), (D), or (F). Electronic service does not add these 3 days.",
      },
    ],
  },
  {
    title: "Federal Rules of Civil Procedure, Rule 8 — General Rules of Pleading",
    citation: "Fed. R. Civ. P. 8",
    url: "https://www.law.cornell.edu/rules/frcp/rule_8",
    jurisdiction: "federal",
    sourceType: "rule",
    caseTypes: ["general", "fcra", "ifp"],
    chunks: [
      {
        heading: "Rule 8(a) — Claim for relief",
        content:
          "A pleading that states a claim for relief must contain a short and plain statement of the grounds for the court's jurisdiction, a short and plain statement of the claim showing the pleader is entitled to relief, and a demand for the relief sought, which may include alternative or different types of relief.",
      },
      {
        heading: "Rule 8(b) — Defenses; admissions and denials",
        content:
          "In responding to a pleading, a party must state its defenses to each claim and admit or deny the allegations. A party that lacks knowledge or information sufficient to form a belief about the truth of an allegation must say so, and that statement has the effect of a denial. An allegation not denied — other than one about the amount of damages — is admitted.",
      },
    ],
  },
  {
    title: "Federal Rules of Civil Procedure, Rule 12 — Defenses and Objections",
    citation: "Fed. R. Civ. P. 12",
    url: "https://www.law.cornell.edu/rules/frcp/rule_12",
    jurisdiction: "federal",
    sourceType: "rule",
    caseTypes: ["general", "fcra", "ifp"],
    chunks: [
      {
        heading: "Rule 12(a) — Time to serve a responsive pleading",
        content:
          "A defendant must serve an answer within 21 days after being served with the summons and complaint. If the defendant timely waived service under Rule 4(d), the answer is due within 60 days after the request for a waiver was sent (90 days if the defendant is outside any U.S. judicial district). Serving a Rule 12 motion alters these periods.",
      },
      {
        heading: "Rule 12(b) — How to present defenses",
        content:
          "Every defense to a claim must be asserted in the responsive pleading, but a party may move to dismiss for: (1) lack of subject-matter jurisdiction; (2) lack of personal jurisdiction; (3) improper venue; (4) insufficient process; (5) insufficient service of process; (6) failure to state a claim upon which relief can be granted; and (7) failure to join a required party. A motion asserting these must be made before pleading if a responsive pleading is allowed.",
      },
      {
        heading: "Rule 12(e) — Motion for a more definite statement",
        content:
          "A party may move for a more definite statement of a pleading that is so vague or ambiguous that the party cannot reasonably prepare a response. The motion must be made before filing a responsive pleading and must point out the defects and the details desired.",
      },
    ],
  },
  {
    title: "Federal Rules of Civil Procedure, Rule 15 — Amended and Supplemental Pleadings",
    citation: "Fed. R. Civ. P. 15",
    url: "https://www.law.cornell.edu/rules/frcp/rule_15",
    jurisdiction: "federal",
    sourceType: "rule",
    caseTypes: ["general", "fcra", "ifp"],
    chunks: [
      {
        heading: "Rule 15(a) — Amendments before trial",
        content:
          "A party may amend its pleading once as a matter of course within 21 days after serving it, or within 21 days after service of a responsive pleading or a Rule 12(b), (e), or (f) motion, whichever is earlier. Otherwise, a party may amend only with the opposing party's written consent or the court's leave, which the court should freely give when justice so requires.",
      },
    ],
  },
  {
    title: "Federal Rules of Civil Procedure, Rule 55 — Default; Default Judgment",
    citation: "Fed. R. Civ. P. 55",
    url: "https://www.law.cornell.edu/rules/frcp/rule_55",
    jurisdiction: "federal",
    sourceType: "rule",
    caseTypes: ["general", "fcra"],
    chunks: [
      {
        heading: "Rule 55(a)–(b) — Entry of default and default judgment",
        content:
          "When a party against whom affirmative relief is sought has failed to plead or otherwise defend, and that failure is shown by affidavit or otherwise, the clerk must enter the party's default. A default judgment may then be entered by the clerk in limited circumstances or, more commonly, by the court on the plaintiff's application. The court may set aside an entry of default for good cause.",
      },
    ],
  },
  {
    title: "Federal Rules of Civil Procedure, Rule 56 — Summary Judgment",
    citation: "Fed. R. Civ. P. 56",
    url: "https://www.law.cornell.edu/rules/frcp/rule_56",
    jurisdiction: "federal",
    sourceType: "rule",
    caseTypes: ["general", "fcra"],
    chunks: [
      {
        heading: "Rule 56(a) — Standard for summary judgment",
        content:
          "The court shall grant summary judgment if the movant shows that there is no genuine dispute as to any material fact and the movant is entitled to judgment as a matter of law. A party may move for summary judgment on a claim or defense, or part of one, and the court should state on the record its reasons for granting or denying the motion.",
      },
    ],
  },
  {
    title: "Federal Rules of Appellate Procedure, Rule 4 — Appeal as of Right: When Taken",
    citation: "Fed. R. App. P. 4",
    url: "https://www.law.cornell.edu/rules/frap/rule_4",
    jurisdiction: "federal",
    sourceType: "rule",
    caseTypes: ["general", "fcra", "ifp"],
    chunks: [
      {
        heading: "Rule 4(a)(1) — Time to file a notice of appeal in a civil case",
        content:
          "In a civil case, the notice of appeal must generally be filed with the district clerk within 30 days after entry of the judgment or order appealed from. When the United States or a federal officer or agency is a party, the deadline is 60 days. Certain post-judgment motions restart the appeal clock, and the court may extend or reopen the time in limited circumstances.",
      },
    ],
  },
  {
    title: "Federal Rules of Evidence, Rule 401 — Test for Relevant Evidence",
    citation: "Fed. R. Evid. 401",
    url: "https://www.law.cornell.edu/rules/fre/rule_401",
    jurisdiction: "federal",
    sourceType: "rule",
    caseTypes: ["general", "fcra", "traffic"],
    chunks: [
      {
        heading: "Rule 401 — Relevance defined",
        content:
          "Evidence is relevant if it has any tendency to make a fact more or less probable than it would be without the evidence, and the fact is of consequence in determining the action. This is a low threshold — relevance concerns whether evidence moves the needle at all, not how much weight it deserves.",
      },
    ],
  },
  {
    title: "Federal Rules of Evidence, Rule 402 — General Admissibility of Relevant Evidence",
    citation: "Fed. R. Evid. 402",
    url: "https://www.law.cornell.edu/rules/fre/rule_402",
    jurisdiction: "federal",
    sourceType: "rule",
    caseTypes: ["general", "fcra", "traffic"],
    chunks: [
      {
        heading: "Rule 402 — Relevant evidence generally admissible",
        content:
          "Relevant evidence is admissible unless the U.S. Constitution, a federal statute, the Federal Rules of Evidence, or other rules prescribed by the Supreme Court provide otherwise. Irrelevant evidence is not admissible.",
      },
    ],
  },
  {
    title: "Fair Credit Reporting Act, 15 U.S.C. § 1681c — Requirements Relating to Information Contained in Consumer Reports",
    citation: "15 U.S.C. § 1681c",
    url: "https://www.law.cornell.edu/uscode/text/15/1681c",
    jurisdiction: "federal",
    sourceType: "statute",
    caseTypes: ["fcra"],
    chunks: [
      {
        heading: "§ 1681c(a) — Time limits on reporting adverse information",
        content:
          "A consumer reporting agency generally may not report most adverse items after 7 years, including accounts placed for collection, civil suits and judgments, and paid tax liens (measured from the relevant date). Bankruptcy cases may be reported for up to 10 years. Certain exceptions apply for large-dollar credit transactions, employment, and life insurance.",
      },
    ],
  },
  {
    title: "Fair Credit Reporting Act, 15 U.S.C. § 1681e — Compliance Procedures",
    citation: "15 U.S.C. § 1681e",
    url: "https://www.law.cornell.edu/uscode/text/15/1681e",
    jurisdiction: "federal",
    sourceType: "statute",
    caseTypes: ["fcra"],
    chunks: [
      {
        heading: "§ 1681e(b) — Maximum possible accuracy",
        content:
          "Whenever a consumer reporting agency prepares a consumer report, it must follow reasonable procedures to assure maximum possible accuracy of the information concerning the individual about whom the report relates. Failure to do so is a common basis for FCRA claims when inaccurate information causes harm.",
      },
    ],
  },
  {
    title: "Fair Credit Reporting Act, 15 U.S.C. § 1681i — Procedure in Case of Disputed Accuracy",
    citation: "15 U.S.C. § 1681i",
    url: "https://www.law.cornell.edu/uscode/text/15/1681i",
    jurisdiction: "federal",
    sourceType: "statute",
    caseTypes: ["fcra"],
    chunks: [
      {
        heading: "§ 1681i(a) — Reinvestigation of disputed information",
        content:
          "When a consumer disputes the completeness or accuracy of an item directly with a consumer reporting agency, the agency must conduct a reasonable reinvestigation to determine whether the disputed information is inaccurate, generally free of charge and within 30 days of receiving the dispute (extendable to 45 days in some circumstances). Information that cannot be verified must be deleted or modified.",
      },
    ],
  },
  {
    title: "Fair Credit Reporting Act, 15 U.S.C. § 1681n — Civil Liability for Willful Noncompliance",
    citation: "15 U.S.C. § 1681n",
    url: "https://www.law.cornell.edu/uscode/text/15/1681n",
    jurisdiction: "federal",
    sourceType: "statute",
    caseTypes: ["fcra"],
    chunks: [
      {
        heading: "§ 1681n — Damages for willful violations",
        content:
          "Any person who willfully fails to comply with an FCRA requirement with respect to a consumer is liable for actual damages or statutory damages of not less than $100 and not more than $1,000, plus punitive damages the court may allow, and reasonable attorney's fees and costs.",
      },
    ],
  },
  {
    title: "Fair Credit Reporting Act, 15 U.S.C. § 1681o — Civil Liability for Negligent Noncompliance",
    citation: "15 U.S.C. § 1681o",
    url: "https://www.law.cornell.edu/uscode/text/15/1681o",
    jurisdiction: "federal",
    sourceType: "statute",
    caseTypes: ["fcra"],
    chunks: [
      {
        heading: "§ 1681o — Damages for negligent violations",
        content:
          "Any person who is negligent in failing to comply with an FCRA requirement with respect to a consumer is liable for the consumer's actual damages sustained as a result, together with reasonable attorney's fees and costs as determined by the court.",
      },
    ],
  },
  {
    title: "Proceedings In Forma Pauperis, 28 U.S.C. § 1915",
    citation: "28 U.S.C. § 1915",
    url: "https://www.law.cornell.edu/uscode/text/28/1915",
    jurisdiction: "federal",
    sourceType: "statute",
    caseTypes: ["ifp"],
    chunks: [
      {
        heading: "§ 1915(a) — Proceeding without prepaying fees",
        content:
          "A federal court may authorize the commencement of a suit without prepayment of fees or costs by a person who submits an affidavit showing that they are unable to pay. The affidavit must state the nature of the action and the affiant's belief that they are entitled to relief. The court may dismiss the case if the allegation of poverty is untrue or the action is frivolous, malicious, or fails to state a claim.",
      },
    ],
  },
];
