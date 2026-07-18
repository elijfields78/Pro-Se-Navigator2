/**
 * Documents data layer — Supabase Storage (bytes) + `documents` table (metadata).
 *
 * Storage object paths follow `{userId}/{caseId}/{documentId}-{safeName}` so the
 * storage RLS policies (see migrations/004_documents.sql) can authorize by the
 * first path segment. Requires the migration + the `case-documents` bucket to be
 * applied before any upload will succeed.
 */
import { supabase } from '@/lib/supabase';
import { CaseDocument, DocumentSource } from '@/contexts/types';

const BUCKET = 'case-documents';

/** Hard cap on upload size. Keeps a single document to something a phone can
 *  realistically handle and bounds storage cost. */
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024; // 25 MB

/** Allowed MIME types (prefix match on the group for images). */
const ALLOWED_MIME_PREFIXES = ['image/'];
const ALLOWED_MIME_EXACT = new Set([
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export function isAllowedMimeType(mime: string | undefined): boolean {
  if (!mime) return true; // some pickers omit it; storage/type is best-effort
  if (ALLOWED_MIME_EXACT.has(mime)) return true;
  return ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p));
}

export interface DocumentUploadInput {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
  source: DocumentSource;
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

/** Strip path separators and unusual characters from a user-supplied file name. */
function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'document';
}

function dbToDocument(row: Record<string, any>): CaseDocument {
  return {
    id: row.id,
    caseId: row.case_id,
    caseTitle: row.case_title ?? '',
    name: row.name,
    storagePath: row.storage_path,
    mimeType: row.mime_type ?? undefined,
    sizeBytes: row.size_bytes ?? undefined,
    source: row.source,
    createdAt: row.created_at,
  };
}

/**
 * Upload a picked file's bytes to Storage and record its metadata.
 *
 * Reads the local file URI as an ArrayBuffer (the Supabase-recommended path for
 * React Native — Blob uploads can be zero-length on RN). Validates size and type
 * before touching the network. Rolls back the storage object if the metadata
 * insert fails, so we never leave an orphaned file.
 */
export async function uploadCaseDocument(params: {
  userId: string;
  caseId: string;
  caseTitle: string;
  input: DocumentUploadInput;
}): Promise<CaseDocument> {
  const { userId, caseId, caseTitle, input } = params;

  if (!isAllowedMimeType(input.mimeType)) {
    throw new Error('That file type is not supported.');
  }
  if (input.size != null && input.size > MAX_DOCUMENT_BYTES) {
    throw new Error('That file is too large (max 25 MB).');
  }

  const resp = await fetch(input.uri);
  const arrayBuffer = await resp.arrayBuffer();

  // Enforce the size cap even when the picker didn't report a size.
  if (arrayBuffer.byteLength > MAX_DOCUMENT_BYTES) {
    throw new Error('That file is too large (max 25 MB).');
  }

  const id = genId();
  const safeName = sanitizeName(input.name);
  const storagePath = `${userId}/${caseId}/${id}-${safeName}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: input.mimeType ?? 'application/octet-stream',
      upsert: false,
    });
  if (uploadErr) {
    throw new Error(`Upload failed: ${uploadErr.message}`);
  }

  const createdAt = new Date().toISOString();
  const { error: insertErr } = await supabase.from('documents').insert({
    id,
    case_id: caseId,
    user_id: userId,
    case_title: caseTitle,
    name: input.name,
    storage_path: storagePath,
    mime_type: input.mimeType ?? null,
    size_bytes: input.size ?? arrayBuffer.byteLength,
    source: input.source,
    created_at: createdAt,
  });
  if (insertErr) {
    // Roll back the uploaded object so it isn't orphaned.
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw new Error(`Could not save document: ${insertErr.message}`);
  }

  return {
    id,
    caseId,
    caseTitle,
    name: input.name,
    storagePath,
    mimeType: input.mimeType,
    sizeBytes: input.size ?? arrayBuffer.byteLength,
    source: input.source,
    createdAt,
  };
}

/** Load all documents for a user (RLS also scopes this server-side). */
export async function listUserDocuments(userId: string): Promise<CaseDocument[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(dbToDocument);
}

/** Delete a document: remove the storage object, then the metadata row. */
export async function deleteCaseDocument(doc: CaseDocument): Promise<void> {
  const { error: storageErr } = await supabase.storage
    .from(BUCKET)
    .remove([doc.storagePath]);
  if (storageErr) throw new Error(`Could not delete file: ${storageErr.message}`);

  const { error: rowErr } = await supabase.from('documents').delete().eq('id', doc.id);
  if (rowErr) throw new Error(`Could not delete document record: ${rowErr.message}`);
}

/** Create a short-lived signed URL for viewing/downloading a private document. */
export async function getDocumentSignedUrl(
  storagePath: string,
  expiresInSeconds = 300,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data) throw new Error(`Could not create link: ${error?.message}`);
  return data.signedUrl;
}
