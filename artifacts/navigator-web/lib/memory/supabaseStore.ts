/**
 * Supabase-backed MemoryStore over the nav_* tables (schema.sql). RLS scopes
 * every query to the signed-in user; this store never bypasses it (anon key +
 * user session, not the service role).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  MemoryStore,
  CaseMemory,
  ToneProfile,
  MemoryEvent,
  AssetRecord,
} from './index';

export class SupabaseMemoryStore implements MemoryStore {
  constructor(
    private db: SupabaseClient,
    private userId: string,
  ) {}

  async getCaseMemory(caseId: string): Promise<CaseMemory> {
    const [caseRes, toneRes, eventsRes, assetsRes] = await Promise.all([
      this.db.from('nav_cases').select('canonical_caption, signature_block').eq('id', caseId).maybeSingle(),
      this.db.from('nav_tone_preferences').select('profile, banned_extra').eq('case_id', caseId).maybeSingle(),
      this.db.from('nav_memory_events').select('kind, content, created_at').eq('case_id', caseId).order('created_at'),
      this.db.from('nav_assets').select('id, title, kind, storage_path, created_at').eq('case_id', caseId).order('created_at'),
    ]);
    if (caseRes.error) throw caseRes.error;

    const events: MemoryEvent[] = (eventsRes.data ?? []).map((e) => ({
      kind: e.kind,
      content: e.content,
      createdAt: e.created_at,
    }));
    const assets: AssetRecord[] = (assetsRes.data ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      kind: a.kind,
      storagePath: a.storage_path ?? undefined,
      createdAt: a.created_at,
    }));

    return {
      caseId,
      canonicalCaption: caseRes.data?.canonical_caption ?? undefined,
      signatureBlock: caseRes.data?.signature_block ?? undefined,
      toneProfile: {
        rules: (toneRes.data?.profile as Record<string, unknown>) ?? {},
        bannedExtra: toneRes.data?.banned_extra ?? [],
      },
      events,
      assets,
    };
  }

  async setCanonicalCaption(caseId: string, caption: string): Promise<void> {
    const { error } = await this.db.from('nav_cases').update({ canonical_caption: caption }).eq('id', caseId);
    if (error) throw error;
    await this.recordEvent(caseId, { kind: 'durable_fact', content: `Canonical caption set: ${caption}` });
  }

  async setSignatureBlock(caseId: string, block: string): Promise<void> {
    const { error } = await this.db.from('nav_cases').update({ signature_block: block }).eq('id', caseId);
    if (error) throw error;
    await this.recordEvent(caseId, { kind: 'durable_fact', content: 'Signature block set.' });
  }

  async setToneProfile(caseId: string, profile: ToneProfile): Promise<void> {
    const { error } = await this.db.from('nav_tone_preferences').upsert(
      {
        case_id: caseId,
        user_id: this.userId,
        profile: profile.rules,
        banned_extra: profile.bannedExtra,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'case_id' },
    );
    if (error) throw error;
  }

  async recordEvent(caseId: string, event: Omit<MemoryEvent, 'createdAt'>): Promise<void> {
    const { error } = await this.db.from('nav_memory_events').insert({
      case_id: caseId,
      user_id: this.userId,
      kind: event.kind,
      content: event.content,
    });
    if (error) throw error;
  }

  async recordAsset(caseId: string, asset: Omit<AssetRecord, 'createdAt'>): Promise<void> {
    const { error } = await this.db.from('nav_assets').insert({
      id: asset.id,
      case_id: caseId,
      user_id: this.userId,
      title: asset.title,
      kind: asset.kind,
      storage_path: asset.storagePath ?? null,
    });
    if (error) throw error;
  }
}
