-- GIMA Analytics Phase 14: contracts, invoices and manual payments
-- REVIEW before running in Supabase SQL Editor. No payment gateway or storage bucket.
begin;
create extension if not exists pgcrypto;
create table if not exists public.client_contracts (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 client_name text not null check(length(trim(client_name)) between 2 and 160),
 reference text not null check(length(trim(reference)) between 2 and 80),
 description text not null default '',
 amount_idr bigint not null check(amount_idr>=0),
 starts_on date not null,
 ends_on date,
 status text not null default 'draft' check(status in ('draft','active','completed','cancelled')),
 created_at timestamptz not null default now(),
 constraint client_contract_dates check(ends_on is null or ends_on>=starts_on),
 unique(organization_id,reference),
 unique(id,organization_id)
);
create table if not exists public.client_invoices (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 contract_id uuid not null,
 invoice_number text not null check(length(trim(invoice_number)) between 2 and 80),
 issued_on date not null default current_date,
 due_on date not null,
 amount_idr bigint not null check(amount_idr>0),
 status text not null default 'draft' check(status in ('draft','issued','void')),
 created_at timestamptz not null default now(),
 foreign key(contract_id,organization_id) references public.client_contracts(id,organization_id),
 unique(organization_id,invoice_number),
 unique(id,organization_id),
 constraint invoice_dates check(due_on>=issued_on)
);
create table if not exists public.client_payments (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 invoice_id uuid not null,
 amount_idr bigint not null check(amount_idr>0),
 paid_on date not null,
 transfer_reference text not null check(length(trim(transfer_reference)) between 2 and 120),
 status text not null default 'pending' check(status in ('pending','verified','rejected')),
 created_at timestamptz not null default now(),
 foreign key(invoice_id,organization_id) references public.client_invoices(id,organization_id),
 unique(organization_id,transfer_reference)
);
create index if not exists idx_client_contracts_org on public.client_contracts(organization_id);
create index if not exists idx_client_invoices_org on public.client_invoices(organization_id);
create index if not exists idx_client_payments_org on public.client_payments(organization_id);
alter table public.client_contracts enable row level security;
alter table public.client_invoices enable row level security;
alter table public.client_payments enable row level security;
-- Use direct membership lookups; no public read or write.
create policy "contracts_read_manager" on public.client_contracts for select to authenticated
 using(exists(select 1 from public.organization_members m where m.organization_id=client_contracts.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')));
create policy "contracts_insert_manager" on public.client_contracts for insert to authenticated
 with check(exists(select 1 from public.organization_members m where m.organization_id=client_contracts.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')));
create policy "contracts_update_manager" on public.client_contracts for update to authenticated
 using(exists(select 1 from public.organization_members m where m.organization_id=client_contracts.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')))
 with check(exists(select 1 from public.organization_members m where m.organization_id=client_contracts.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')));
create policy "invoices_read_manager" on public.client_invoices for select to authenticated
 using(exists(select 1 from public.organization_members m where m.organization_id=client_invoices.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')));
create policy "invoices_insert_manager" on public.client_invoices for insert to authenticated
 with check(exists(select 1 from public.organization_members m where m.organization_id=client_invoices.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')));
create policy "invoices_update_manager" on public.client_invoices for update to authenticated
 using(exists(select 1 from public.organization_members m where m.organization_id=client_invoices.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')))
 with check(exists(select 1 from public.organization_members m where m.organization_id=client_invoices.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')));
create policy "payments_read_manager" on public.client_payments for select to authenticated
 using(exists(select 1 from public.organization_members m where m.organization_id=client_payments.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')));
create policy "payments_insert_manager" on public.client_payments for insert to authenticated
 with check(exists(select 1 from public.organization_members m where m.organization_id=client_payments.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')));
create policy "payments_update_owner" on public.client_payments for update to authenticated
 using(exists(select 1 from public.organization_members m where m.organization_id=client_payments.organization_id and m.user_id=(select auth.uid()) and m.role='owner'))
 with check(exists(select 1 from public.organization_members m where m.organization_id=client_payments.organization_id and m.user_id=(select auth.uid()) and m.role='owner'));
-- Explicit grants are required if project defaults revoked table privileges.
grant select,insert,update on public.client_contracts,public.client_invoices to authenticated;
grant select,insert on public.client_payments to authenticated;
grant update on public.client_payments to authenticated;
revoke all on public.client_contracts,public.client_invoices,public.client_payments from anon;
commit;
