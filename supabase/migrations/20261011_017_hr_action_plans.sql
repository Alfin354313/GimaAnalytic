-- GIMA Analytics Phase 17: HR action plans (manual Supabase migration)
begin;
create extension if not exists pgcrypto;
create table if not exists public.hr_action_plans (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 survey_id uuid references public.surveys(id) on delete set null,
 title text not null check(char_length(btrim(title)) between 3 and 160),
 description text not null default '' check(char_length(description)<=3000),
 owner_name text not null default '' check(char_length(owner_name)<=160),
 due_on date,
 priority text not null default 'medium' check(priority in ('low','medium','high')),
 status text not null default 'planned' check(status in ('planned','in_progress','completed','cancelled')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists idx_hr_action_plans_org on public.hr_action_plans(organization_id,status);
alter table public.hr_action_plans enable row level security;
-- Restrict access to organization owner/admin; survey linkage must be same tenant.
drop policy if exists hr_action_plans_read on public.hr_action_plans;
create policy hr_action_plans_read on public.hr_action_plans for select to authenticated
using(exists(select 1 from public.organization_members m where m.organization_id=hr_action_plans.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')));
drop policy if exists hr_action_plans_insert on public.hr_action_plans;
create policy hr_action_plans_insert on public.hr_action_plans for insert to authenticated
with check(
 exists(select 1 from public.organization_members m where m.organization_id=hr_action_plans.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin'))
 and (survey_id is null or exists(select 1 from public.surveys s where s.id=survey_id and s.organization_id=hr_action_plans.organization_id))
);
drop policy if exists hr_action_plans_update on public.hr_action_plans;
create policy hr_action_plans_update on public.hr_action_plans for update to authenticated
using(exists(select 1 from public.organization_members m where m.organization_id=hr_action_plans.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')))
with check(
 exists(select 1 from public.organization_members m where m.organization_id=hr_action_plans.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin'))
 and (survey_id is null or exists(select 1 from public.surveys s where s.id=survey_id and s.organization_id=hr_action_plans.organization_id))
);
revoke all on public.hr_action_plans from anon;
grant select,insert,update on public.hr_action_plans to authenticated;
commit;
