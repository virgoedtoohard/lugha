-- Lugha — Supabase schema
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to re-run.

-- ---------- Profiles (one per user, created automatically at sign-up) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'learner' check (role in ('learner', 'reviewer', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper used by the security rules below
create or replace function public.is_reviewer()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('reviewer', 'admin'));
$$;

alter table public.profiles enable row level security;
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (id = auth.uid());
drop policy if exists "update own name" on public.profiles;
create policy "update own name" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));
-- (users can rename themselves but can't change their own role)

-- ---------- Learner progress (one JSON blob per user) ----------
create table if not exists public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.progress enable row level security;
drop policy if exists "own progress" on public.progress;
create policy "own progress" on public.progress for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Reviewer corrections to lesson content ----------
create table if not exists public.content_overrides (
  item_id text primary key,
  course_code text not null,
  target text,
  english text,
  note text,
  audio_url text,
  status text not null default 'draft' check (status in ('draft', 'reviewed')),
  confidence text not null default 'low' check (confidence in ('low', 'medium', 'high')),
  reviewed_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.content_overrides enable row level security;
drop policy if exists "anyone can read content" on public.content_overrides;
create policy "anyone can read content" on public.content_overrides for select using (true);
drop policy if exists "reviewers insert content" on public.content_overrides;
create policy "reviewers insert content" on public.content_overrides for insert with check (public.is_reviewer());
drop policy if exists "reviewers update content" on public.content_overrides;
create policy "reviewers update content" on public.content_overrides for update using (public.is_reviewer()) with check (public.is_reviewer());

-- ---------- Audio storage (public to listen, reviewers to upload) ----------
insert into storage.buckets (id, name, public) values ('audio', 'audio', true)
  on conflict (id) do update set public = true;

drop policy if exists "reviewers upload audio" on storage.objects;
create policy "reviewers upload audio" on storage.objects for insert
  with check (bucket_id = 'audio' and public.is_reviewer());
drop policy if exists "reviewers replace audio" on storage.objects;
create policy "reviewers replace audio" on storage.objects for update
  using (bucket_id = 'audio' and public.is_reviewer());

-- ---------- Make someone a reviewer (run separately, with their email) ----------
-- update public.profiles set role = 'reviewer'
--   where id = (select id from auth.users where email = 'reviewer@example.com');
