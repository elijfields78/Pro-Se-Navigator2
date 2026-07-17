-- ============================================================
-- Pro Se Navigator — Documents pillar
-- Run in Supabase SQL Editor after 001_initial.sql.
--
-- A per-user, per-case document store. Metadata lives in `documents`; the file
-- bytes live in the private Storage bucket `case-documents`. Both are locked to
-- the owner via RLS. Storage object paths follow the convention:
--   {user_id}/{case_id}/{document_id}-{filename}
-- so the storage policies can authorize by the first path segment (user id).
-- ============================================================

-- ── Documents (metadata) ───────────────────────────────────
create table if not exists documents (
  id            text        primary key,
  case_id       text        references cases on delete cascade not null,
  user_id       uuid        references auth.users on delete cascade not null,
  case_title    text        not null default '',
  name          text        not null,
  storage_path  text        not null,
  mime_type     text,
  size_bytes    bigint,
  source        text        not null check (source in ('image', 'camera', 'file')),
  created_at    timestamptz not null default now()
);

create index if not exists documents_case_idx on documents (case_id);

alter table documents enable row level security;

-- Owner-only, and the referenced case must also belong to the same user
-- (the EXISTS subquery is itself subject to cases' RLS).
drop policy if exists "documents: owner full access" on documents;
create policy "documents: owner full access"
  on documents for all
  using (
    auth.uid() = user_id
    and exists (
      select 1 from cases
      where cases.id = documents.case_id
        and cases.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from cases
      where cases.id = documents.case_id
        and cases.user_id = auth.uid()
    )
  );

-- ── Storage bucket (private) ───────────────────────────────
insert into storage.buckets (id, name, public)
values ('case-documents', 'case-documents', false)
on conflict (id) do nothing;

-- Storage RLS: an authenticated user may only touch objects whose first path
-- segment equals their own user id. Applies to read/insert/update/delete.
drop policy if exists "case-docs: owner select" on storage.objects;
create policy "case-docs: owner select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'case-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "case-docs: owner insert" on storage.objects;
create policy "case-docs: owner insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'case-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "case-docs: owner update" on storage.objects;
create policy "case-docs: owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'case-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "case-docs: owner delete" on storage.objects;
create policy "case-docs: owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'case-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
