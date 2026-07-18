// Verification agent — stacks two independent sources so neither is the sole
// authority. CourtListener (authoritative legal database) extracts and
// primary-verifies case-law citations; for anything it can't confirm, Perplexity
// (live web search) is an independent second check. A real case CourtListener
// simply doesn't index can still be corroborated by the web; a citation BOTH
// sources fail to confirm is flagged (never silently trusted, never suppressed).

import {
  verifyCitationsInText,
  isVerificationConfigured as isCourtListenerConfigured,
} from "./courtlistener";
import {
  confirmCitationWithPerplexity,
  isResearchConfigured as isPerplexityConfigured,
} from "./perplexity";

export type FinalStatus =
  | "verified" // CourtListener confirmed (primary authority)
  | "corroborated" // CourtListener couldn't, but the web independently confirmed
  | "ambiguous" // real case, multiple matching records — not pinned to one
  | "unverified" // neither source could confirm — flag, do not trust or hide
  | "error";

export interface CitationCheck {
  citation: string;
  status: FinalStatus;
  caseName?: string;
  /** CourtListener opinion URL (primary source), when available. */
  primaryUrl?: string;
  /** Independent web source URL (secondary), when the web corroborated it. */
  secondaryUrl?: string;
  /** Which sources confirmed this citation, e.g. ["CourtListener"], ["Perplexity"]. */
  verifiedBy: string[];
  note?: string;
}

export function isAnyVerifierConfigured(): boolean {
  return isCourtListenerConfigured() || isPerplexityConfigured();
}

// Cap how many web second-checks we run per request so a citation-heavy answer
// can't fan out into many paid Perplexity calls.
const MAX_SECONDARY_CHECKS = 5;

export async function verifyCitations(text: string): Promise<CitationCheck[]> {
  // CourtListener is the extractor + primary verifier.
  const primary = await verifyCitationsInText(text);
  const usePerplexity = isPerplexityConfigured();
  let secondaryBudget = MAX_SECONDARY_CHECKS;

  const out: CitationCheck[] = [];
  for (const p of primary) {
    if (p.status === "verified") {
      out.push({
        citation: p.citation,
        status: "verified",
        caseName: p.caseName,
        primaryUrl: p.url,
        verifiedBy: ["CourtListener"],
      });
      continue;
    }

    // CourtListener didn't definitively confirm — try the independent web check.
    if (usePerplexity && secondaryBudget > 0) {
      secondaryBudget -= 1;
      try {
        const confirm = await confirmCitationWithPerplexity({
          citation: p.citation,
          caseName: p.caseName,
        });
        if (confirm.confirmed) {
          out.push({
            citation: p.citation,
            // Ambiguous-but-web-confirmed stays "ambiguous" (multiple records
            // exist); a not-found-but-web-confirmed becomes "corroborated".
            status: p.status === "ambiguous" ? "ambiguous" : "corroborated",
            caseName: p.caseName,
            primaryUrl: p.url,
            secondaryUrl: confirm.sourceUrl,
            verifiedBy: p.status === "ambiguous" ? ["CourtListener", "Perplexity"] : ["Perplexity"],
            note: confirm.note,
          });
          continue;
        }
        // Web could not confirm either.
        out.push({
          citation: p.citation,
          status: p.status === "ambiguous" ? "ambiguous" : "unverified",
          caseName: p.caseName,
          primaryUrl: p.url,
          verifiedBy: p.status === "ambiguous" ? ["CourtListener"] : [],
          note: confirm.note,
        });
        continue;
      } catch {
        // Fall through to the primary-only mapping on a web-check failure.
      }
    }

    // No web check available (or it errored): report the primary result honestly.
    out.push({
      citation: p.citation,
      status:
        p.status === "ambiguous" ? "ambiguous" : p.status === "error" ? "error" : "unverified",
      caseName: p.caseName,
      primaryUrl: p.url,
      verifiedBy: p.status === "ambiguous" ? ["CourtListener"] : [],
    });
  }

  return out;
}
