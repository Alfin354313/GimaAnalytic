-- Phase 18B: requests only. This never activates subscriptions.
begin;
create table if not exists public.gima_subscription_requests (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 plan_id uuid not null references public.gima_subscription_plans(id),
 requested_by uuid not null default auth.uid() references auth.users(id),
 transfer_reference text not null check(length(btrim(transfer_reference)) between 4 and 120),
 transfer_date date not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now()
);
create unique index if not exists gima_one_pending_subscription_request on public.gima_subscription_requests(organization_id) where status='pending';
create index if not exists gima_subscription_requests_org on public.gima_subscription_requests(organization_id,created_at desc);
alter table public.gima_subscription_requests enable row level security;
revoke all on public.gima_subscription_requests from anon,authenticated;
grant select,insert on public.gima_subscription_requests to authenticated;
drop policy if exists gima_subscription_requests_read on public.gima_subscription_requests;
create policy gima_subscription_requests_read on public.gima_subscription_requests for select to authenticated using (
 exists(select 1 from public.organization_members m where m.organization_id=gima_subscription_requests.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin'))
);
drop policy if exists gima_subscription_requests_submit on public.gima_subscription_requests;
create policy gima_subscription_requests_submit on public.gima_subscription_requests for insert to authenticated with check (
 requested_by=(select auth.uid()) and status='pending' and
 exists(select 1 from public.organization_members m where m.organization_id=gima_subscription_requests.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')) and
 exists(select 1 from public.gima_subscription_plans p where p.id=gima_subscription_requests.plan_id and p.is_active=true)
);
commit;
