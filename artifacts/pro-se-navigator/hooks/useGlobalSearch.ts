import { useMemo } from 'react';
import { useCases } from '@/contexts/CasesContext';

export type GlobalResultType = 'case' | 'message' | 'deadline' | 'source';

export interface GlobalResult {
  /** Stable key for lists. */
  key: string;
  type: GlobalResultType;
  /** Primary line (case title, message snippet, deadline description, citation). */
  title: string;
  /** Secondary context line (case title / rule / etc.). */
  subtitle?: string;
  /** The case this result belongs to — used for navigation. */
  caseId: string;
}

export interface GlobalResultSection {
  title: string;
  type: GlobalResultType;
  data: GlobalResult[];
}

function includesQ(haystack: string | undefined, q: string): boolean {
  return !!haystack && haystack.toLowerCase().includes(q);
}

/**
 * Read-only search across the already-loaded case data. Returns sectioned
 * results (Cases / Messages / Deadlines / Sources). Empty query → no sections.
 *
 * Pure client-side filtering over context state — no queries, no business logic.
 */
export function useGlobalSearch(query: string): GlobalResultSection[] {
  const { cases, messages, deadlines, sources } = useCases();

  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    // ── Cases ──
    const caseResults: GlobalResult[] = cases
      .filter((c) => includesQ(c.title, q) || includesQ(c.caseType, q))
      .map((c) => ({
        key: `case-${c.id}`,
        type: 'case' as const,
        title: c.title || 'Untitled case',
        subtitle: c.caseType,
        caseId: c.id,
      }));

    // ── Messages (first 200 chars) ──
    const messageResults: GlobalResult[] = [];
    for (const [caseId, msgs] of Object.entries(messages)) {
      const caseTitle = cases.find((c) => c.id === caseId)?.title || 'Untitled case';
      for (const m of msgs) {
        const snippet = m.content.slice(0, 200);
        if (includesQ(snippet, q)) {
          messageResults.push({
            key: `msg-${m.id}`,
            type: 'message',
            title: m.content.length > 120 ? m.content.slice(0, 120) + '…' : m.content,
            subtitle: `${m.role === 'navigator' ? 'Navigator' : 'You'} · ${caseTitle}`,
            caseId,
          });
        }
        if (messageResults.length >= 20) break;
      }
    }

    // ── Deadlines ──
    const deadlineResults: GlobalResult[] = deadlines
      .filter((d) => includesQ(d.description, q) || includesQ(d.caseTitle, q))
      .map((d) => ({
        key: `deadline-${d.id}`,
        type: 'deadline' as const,
        title: d.description,
        subtitle: d.caseTitle,
        caseId: d.caseId,
      }));

    // ── Sources ──
    const sourceResults: GlobalResult[] = sources
      .filter((s) => includesQ(s.citation, q) || includesQ(s.quote, q))
      .map((s) => ({
        key: `source-${s.id}`,
        type: 'source' as const,
        title: s.citation,
        subtitle: s.caseTitle,
        caseId: s.caseId,
      }));

    const sections: GlobalResultSection[] = [];
    if (caseResults.length) sections.push({ title: 'CASES', type: 'case', data: caseResults });
    if (messageResults.length) sections.push({ title: 'MESSAGES', type: 'message', data: messageResults });
    if (deadlineResults.length) sections.push({ title: 'DEADLINES', type: 'deadline', data: deadlineResults });
    if (sourceResults.length) sections.push({ title: 'SOURCES', type: 'source', data: sourceResults });
    return sections;
  }, [query, cases, messages, deadlines, sources]);
}
