-- GIMA Analytics • Phase 5 foundation (Supabase PostgreSQL)
-- Review before running. This script does NOT enable public survey collection.
create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 160),
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','analyst')),
  created_at timestamptz not null default now(),
  primary key (organization_id,user_id)
);

create table if not exists public.surveys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (length(trim(title)) between 3 and 160),
  description text not null default '',
  status text not null default 'draft' check (status in ('draft','published','closed')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  position integer not null check (position between 1 and 500),
  prompt text not null check (length(trim(prompt)) between 1 and 1000),
  question_type text not null default 'likert_5' check (question_type in ('likert_5')),
  unique(survey_id,position)
);

create index if not exists idx_members_user on public.organization_members(user_id);
create index if not exists idx_surveys_org on public.surveys(organization_id);
create index if not exists idx_questions_survey on public.survey_questions(survey_id);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.surveys enable row level security;
alter table public.survey_questions enable row level security;

-- SECURITY NOTE: no INSERT/UPDATE/DELETE policies are granted in phase 5.
-- Organization creation and initial owner assignment must be performed by a
-- trusted server-side provisioning flow, not an anonymous browser client.
-- Memberships are readable only for the current user, avoiding recursive RLS.
drop policy if exists "members_read_own" on public.organization_members;
create policy "members_read_own" on public.organization_members
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "organizations_read_member" on public.organizations;
create policy "organizations_read_member" on public.organizations
  for select to authenticated
  using (exists (
    select 1 from public.organization_members m
    where m.organization_id = organizations.id and m.user_id = (select auth.uid())
  ));

drop policy if exists "surveys_read_member" on public.surveys;
create policy "surveys_read_member" on public.surveys
  for select to authenticated
  using (exists (
    select 1 from public.organization_members m
    where m.organization_id = surveys.organization_id and m.user_id = (select auth.uid())
  ));

drop policy if exists "questions_read_member" on public.survey_questions;
create policy "questions_read_member" on public.survey_questions
  for select to authenticated
  using (exists (
    select 1 from public.surveys s
    join public.organization_members m on m.organization_id = s.organization_id
    where s.id = survey_questions.survey_id and m.user_id = (select auth.uid())
  ));

-- No response or respondent tables yet: anonymity, consent, retention,
-- aggregation thresholds, and abuse protection must be designed first.
