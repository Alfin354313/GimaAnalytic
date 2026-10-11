-- Phase 15: employee directory and organization departments
-- Run manually in Supabase SQL Editor after review; does not import or modify existing employees.
begin;
create extension if not exists pgcrypto;

create table if not exists public.hr_departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  created_at timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, name)
);

create table if not exists public.hr_employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  department_id uuid,
  employee_code text not null check (char_length(btrim(employee_code)) between 1 and 60),
  full_name text not null check (char_length(btrim(full_name)) between 2 and 160),
  job_title text not null default '' check (char_length(job_title) <= 160),
  employment_status text not null default 'active'
    check (employment_status in ('active', 'on_leave', 'exited')),
  hired_on date,
  exited_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_code),
  foreign key (department_id, organization_id)
    references public.hr_departments (id, organization_id),
  constraint hr_employee_dates check (
    exited_on is null or (hired_on is not null and exited_on >= hired_on)
  ),
  constraint hr_employee_exit_status check (
    (employment_status = 'exited' and exited_on is not null)
    or (employment_status <> 'exited' and exited_on is null)
  )
);

create index if not exists idx_hr_departments_org on public.hr_departments (organization_id);
create index if not exists idx_hr_employees_org_status on public.hr_employees (organization_id, employment_status);
create index if not exists idx_hr_employees_org_department on public.hr_employees (organization_id, department_id);

alter table public.hr_departments enable row level security;
alter table public.hr_employees enable row level security;

-- Read and write of employee-level data are limited to HR organization managers.
drop policy if exists hr_departments_manager_select on public.hr_departments;
create policy hr_departments_manager_select on public.hr_departments
for select to authenticated using (
  exists (select 1 from public.organization_members m
    where m.organization_id = hr_departments.organization_id
      and m.user_id = (select auth.uid()) and m.role in ('owner','admin'))
);
drop policy if exists hr_departments_manager_insert on public.hr_departments;
create policy hr_departments_manager_insert on public.hr_departments
for insert to authenticated with check (
  exists (select 1 from public.organization_members m
    where m.organization_id = hr_departments.organization_id
      and m.user_id = (select auth.uid()) and m.role in ('owner','admin'))
);
drop policy if exists hr_departments_manager_update on public.hr_departments;
create policy hr_departments_manager_update on public.hr_departments
for update to authenticated using (
  exists (select 1 from public.organization_members m
    where m.organization_id = hr_departments.organization_id
      and m.user_id = (select auth.uid()) and m.role in ('owner','admin'))
) with check (
  exists (select 1 from public.organization_members m
    where m.organization_id = hr_departments.organization_id
      and m.user_id = (select auth.uid()) and m.role in ('owner','admin'))
);
drop policy if exists hr_employees_manager_select on public.hr_employees;
create policy hr_employees_manager_select on public.hr_employees
for select to authenticated using (
  exists (select 1 from public.organization_members m
    where m.organization_id = hr_employees.organization_id
      and m.user_id = (select auth.uid()) and m.role in ('owner','admin'))
);
drop policy if exists hr_employees_manager_insert on public.hr_employees;
create policy hr_employees_manager_insert on public.hr_employees
for insert to authenticated with check (
  exists (select 1 from public.organization_members m
    where m.organization_id = hr_employees.organization_id
      and m.user_id = (select auth.uid()) and m.role in ('owner','admin'))
);
drop policy if exists hr_employees_manager_update on public.hr_employees;
create policy hr_employees_manager_update on public.hr_employees
for update to authenticated using (
  exists (select 1 from public.organization_members m
    where m.organization_id = hr_employees.organization_id
      and m.user_id = (select auth.uid()) and m.role in ('owner','admin'))
) with check (
  exists (select 1 from public.organization_members m
    where m.organization_id = hr_employees.organization_id
      and m.user_id = (select auth.uid()) and m.role in ('owner','admin'))
);

revoke all on public.hr_departments, public.hr_employees from anon;
grant select, insert, update on public.hr_departments, public.hr_employees to authenticated;
commit;
