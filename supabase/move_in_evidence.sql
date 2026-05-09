-- =============================================================================
-- Move-In Documentation: storage bucket + table + policies.
-- Run this once in Supabase Studio → SQL Editor for the project.
-- =============================================================================

-- 1. Storage bucket (private; access via signed URLs only).
insert into storage.buckets (id, name, public)
values ('move-in-evidence', 'move-in-evidence', false)
on conflict (id) do nothing;

-- 2. Metadata table.
create table if not exists public.move_in_evidence (
  id              uuid primary key default gen_random_uuid(),
  mobile_number   text not null,
  slot            text not null,
  storage_path    text not null,
  image_url       text not null,
  mime_type       text,
  captured_at     timestamptz not null,
  latitude        double precision,
  longitude       double precision,
  accuracy_meters double precision,
  created_at      timestamptz not null default now(),
  unique (mobile_number, slot)
);

create index if not exists move_in_evidence_mobile_idx
  on public.move_in_evidence (mobile_number);

-- 3. Policies. The app currently authenticates via mobile-number OTP and
--    talks to Supabase with the anon key (same pattern as `profiles`).
--    These permissive policies mirror that. Tighten before production by
--    moving uploads behind the Spring Boot backend with the service role
--    key, or by adopting Supabase Auth.

alter table public.move_in_evidence enable row level security;

drop policy if exists "anon read move_in_evidence" on public.move_in_evidence;
create policy "anon read move_in_evidence"
  on public.move_in_evidence for select
  to anon, authenticated
  using (true);

drop policy if exists "anon insert move_in_evidence" on public.move_in_evidence;
create policy "anon insert move_in_evidence"
  on public.move_in_evidence for insert
  to anon, authenticated
  with check (true);

drop policy if exists "anon update move_in_evidence" on public.move_in_evidence;
create policy "anon update move_in_evidence"
  on public.move_in_evidence for update
  to anon, authenticated
  using (true)
  with check (true);

-- 4. Storage policies for the bucket.
drop policy if exists "anon read move-in-evidence" on storage.objects;
create policy "anon read move-in-evidence"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'move-in-evidence');

drop policy if exists "anon write move-in-evidence" on storage.objects;
create policy "anon write move-in-evidence"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'move-in-evidence');

drop policy if exists "anon update move-in-evidence" on storage.objects;
create policy "anon update move-in-evidence"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'move-in-evidence')
  with check (bucket_id = 'move-in-evidence');
