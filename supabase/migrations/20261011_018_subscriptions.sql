-- GIMA Analytics Phase 18: SaaS subscriptions (manual approval, no auto-payment)
begin;
create extension if not exists pgcrypto;
create table if not exists public.gima_subscription_plans (
 id uuid primary key default gen_random_uuid(),
 code text not null unique check(code ~ '^[a-z][a-z0-9_]{1,39}$'),
 name text not null check(length(btrim(name)) between 2 and 100),
 description text not null default '',
 price_idr bigint not null default 0 check(price_idr>=0),
 duration_months integer not null default 1 check(duration_months between 1 and 36),
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.gima_organization_subscriptions (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 plan_id uuid not null references public.gima_subscription_plans(id),
 status text not null default 'pending' check(status in ('pending','active','expired','suspended','cancelled')),
 starts_on date,
 ends_on date,
 notes text not null default '' check(length(notes)<=2000),
 approved_by uuid references auth.users(id),
 approved_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint gima_subscription_dates check(starts_on is null or ends_on is null or ends_on>=starts_on),
 constraint gima_subscription_active_dates check(status<>'active' or (starts_on is not null and ends_on is not null and approved_by is not null and approved_at is not null))
);
create unique index if not exists gima_one_current_subscription on public.gima_organization_subscriptions(organization_id) where status in ('pending','active','suspended');
create index if not exists gima_subscriptions_org_status on public.gima_organization_subscriptions(organization_id,status);
alter table public.gima_subscription_plans enable row level security;
alter table public.gima_organization_subscriptions enable row level security;
drop policy if exists gima_plans_read on public.gima_subscription_plans;
create policy gima_plans_read on public.gima_subscription_plans for select to authenticated using(true);
drop policy if exists gima_subscriptions_read on public.gima_organization_subscriptions;
create policy gima_subscriptions_read on public.gima_organization_subscriptions for select to authenticated
using(exists(select 1 from public.organization_members m where m.organization_id=gima_organization_subscriptions.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')));
-- Deliberately no client-side INSERT/UPDATE policies: subscription approval is server/admin-only.
revoke all on public.gima_subscription_plans,public.gima_organization_subscriptions from anon,authenticated;
grant select on public.gima_subscription_plans,public.gima_organization_subscriptions to authenticated;
insert into public.gima_subscription_plans(code,name,description,price_idr,duration_months)
values ('basic','Basic','Paket dasar HR Analytics',0,1),('professional','Professional','Paket HR Analytics untuk tim berkembang',0,1),('enterprise','Enterprise','Paket untuk kebutuhan organisasi besar',0,1)
on conflict(code) do nothing;
commit;
