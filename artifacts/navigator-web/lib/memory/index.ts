/**
 * Layer 3 — Memory service.
 *
 * Per-case durable state: canonical caption, signature block, tone profile,
 * correction history, and the asset index. Memory is first-class: every user
 * correction is a memory event, and the next session must never repeat a
 * corrected mistake.
 *
 * The store is an interface so business logic and tests run against the
 * in-memory implementation while the app runs against Supabase (nav_* tables
 * from schema.sql).
 */

export interface ToneProfile {
  /** e.g. { no_exclamations: true, style: 'measured' } */
  rules: Record<string, unknown>;
  /** Case-specific additions to the global banned vocabulary (never removals). */
  bannedExtra: string[];
}

export interface MemoryEvent {
  kind: 'correction' | 'durable_fact' | 'preference';
  content: string;
  createdAt: string;
}

export interface AssetRecord {
  id: string;
  title: string;
  kind: string;
  storagePath?: string;
  createdAt: string;
}

export interface CaseMemory {
  caseId: string;
  canonicalCaption?: string;
  signatureBlock?: string;
  toneProfile: ToneProfile;
  events: MemoryEvent[];
  assets: AssetRecord[];
}

export interface MemoryStore {
  getCaseMemory(caseId: string): Promise<CaseMemory>;
  /**
   * Caption/signature are guardrail-locked: mutable ONLY through these
   * explicit setters (a settings-level action with confirmation in the UI) —
   * never through a chat turn.
   */
  setCanonicalCaption(caseId: string, caption: string): Promise<void>;
  setSignatureBlock(caseId: string, block: string): Promise<void>;
  setToneProfile(caseId: string, profile: ToneProfile): Promise<void>;
  recordEvent(caseId: string, event: Omit<MemoryEvent, 'createdAt'>): Promise<void>;
  recordAsset(caseId: string, asset: Omit<AssetRecord, 'createdAt'>): Promise<void>;
}

/** In-memory implementation — tests and the E2E harness. */
export class InMemoryStore implements MemoryStore {
  private mem = new Map<string, CaseMemory>();

  private ensure(caseId: string): CaseMemory {
    let m = this.mem.get(caseId);
    if (!m) {
      m = { caseId, toneProfile: { rules: {}, bannedExtra: [] }, events: [], assets: [] };
      this.mem.set(caseId, m);
    }
    return m;
  }

  async getCaseMemory(caseId: string): Promise<CaseMemory> {
    // Structured clone so callers can't mutate the store through the snapshot.
    return structuredClone(this.ensure(caseId));
  }
  async setCanonicalCaption(caseId: string, caption: string): Promise<void> {
    this.ensure(caseId).canonicalCaption = caption;
    await this.recordEvent(caseId, { kind: 'durable_fact', content: `Canonical caption set: ${caption}` });
  }
  async setSignatureBlock(caseId: string, block: string): Promise<void> {
    this.ensure(caseId).signatureBlock = block;
    await this.recordEvent(caseId, { kind: 'durable_fact', content: 'Signature block set.' });
  }
  async setToneProfile(caseId: string, profile: ToneProfile): Promise<void> {
    this.ensure(caseId).toneProfile = structuredClone(profile);
  }
  async recordEvent(caseId: string, event: Omit<MemoryEvent, 'createdAt'>): Promise<void> {
    this.ensure(caseId).events.push({ ...event, createdAt: new Date().toISOString() });
  }
  async recordAsset(caseId: string, asset: Omit<AssetRecord, 'createdAt'>): Promise<void> {
    this.ensure(caseId).assets.push({ ...asset, createdAt: new Date().toISOString() });
  }
}
