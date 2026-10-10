-- Phase 14C: Midtrans sandbox ledger; apply after migration 010.
begin;
create table if not exists public.midtrans_transactions(
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 invoice_id uuid not null unique,
 order_id text not null unique,
 payment_type text not null check(payment_type in ('qris','bank_transfer')),
 transaction_status text not null default 'pending',
 fraud_status text,
 gross_amount bigint not null check(gross_amount>0),
 redirect_url text,
 provider_transaction_id text,
 updated_at timestamptz not null default now(),
 foreign key(invoice_id,organization_id) references public.client_invoices(id,organization_id)
);
create index if not exists idx_midtrans_org on public.midtrans_transactions(organization_id);
alter table public.midtrans_transactions enable row level security;
create policy midtrans_manager_read on public.midtrans_transactions for select to authenticated
using(exists(select 1 from public.organization_members m where m.organization_id=midtrans_transactions.organization_id and m.user_id=(select auth.uid()) and m.role in ('owner','admin')));
revoke all on public.midtrans_transactions from anon,authenticated;
grant select on public.midtrans_transactions to authenticated;
-- Server-side Edge Functions use service_role for writes; clients never insert/modify payment status.
commit;
