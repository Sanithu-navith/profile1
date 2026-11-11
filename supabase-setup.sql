-- Run this entire script in Supabase Dashboard > SQL Editor.
-- First create your admin account in Authentication > Users (Add user).
-- Then copy that user's UUID and replace ADMIN_USER_UUID below before running this script.

create extension if not exists pgcrypto;

create table if not exists public.portfolio_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  category text not null default 'Project',
  technologies text[] not null default '{}',
  image_url text,
  image_path text,
  github_url text,
  demo_url text,
  video_url text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.portfolio_admins enable row level security;
alter table public.projects enable row level security;

-- Admin membership is readable only by the signed-in user checking their own membership.
drop policy if exists "Admins can read own membership" on public.portfolio_admins;
create policy "Admins can read own membership" on public.portfolio_admins
for select to authenticated using (user_id = auth.uid());

-- Public visitors can only read published projects.
drop policy if exists "Public can read published projects" on public.projects;
create policy "Public can read published projects" on public.projects
for select to anon, authenticated using (is_published = true or exists (
  select 1 from public.portfolio_admins a where a.user_id = auth.uid()
));

-- Only explicitly allow-listed admin users can create, edit, or delete projects.
drop policy if exists "Admins can insert projects" on public.projects;
create policy "Admins can insert projects" on public.projects
for insert to authenticated with check (exists (
  select 1 from public.portfolio_admins a where a.user_id = auth.uid()
));

drop policy if exists "Admins can update projects" on public.projects;
create policy "Admins can update projects" on public.projects
for update to authenticated using (exists (
  select 1 from public.portfolio_admins a where a.user_id = auth.uid()
)) with check (exists (
  select 1 from public.portfolio_admins a where a.user_id = auth.uid()
));

drop policy if exists "Admins can delete projects" on public.projects;
create policy "Admins can delete projects" on public.projects
for delete to authenticated using (exists (
  select 1 from public.portfolio_admins a where a.user_id = auth.uid()
));

-- Storage: create a PUBLIC bucket for portfolio images (public reads, admin writes).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-images', 'project-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

drop policy if exists "Public can view project images" on storage.objects;
create policy "Public can view project images" on storage.objects
for select to anon, authenticated using (bucket_id = 'project-images');

drop policy if exists "Admins can upload project images" on storage.objects;
create policy "Admins can upload project images" on storage.objects
for insert to authenticated with check (
  bucket_id = 'project-images' and exists (select 1 from public.portfolio_admins a where a.user_id = auth.uid())
);

drop policy if exists "Admins can update project images" on storage.objects;
create policy "Admins can update project images" on storage.objects
for update to authenticated using (
  bucket_id = 'project-images' and exists (select 1 from public.portfolio_admins a where a.user_id = auth.uid())
) with check (
  bucket_id = 'project-images' and exists (select 1 from public.portfolio_admins a where a.user_id = auth.uid())
);

drop policy if exists "Admins can delete project images" on storage.objects;
create policy "Admins can delete project images" on storage.objects
for delete to authenticated using (
  bucket_id = 'project-images' and exists (select 1 from public.portfolio_admins a where a.user_id = auth.uid())
);

-- IMPORTANT: replace the UUID with the user ID copied from Authentication > Users.
insert into public.portfolio_admins (user_id)
values ('0c175018-0a1c-46f0-8003-39cebca73314'::uuid)
on conflict (user_id) do nothing;
