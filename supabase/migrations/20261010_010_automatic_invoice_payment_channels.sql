-- GIMA Phase 14B: automatic invoice + payment channel preferences
-- Run ONCE after 20261010_009_client_billing.sql; review and back up first.
begin;
alter table public.client_invoices
 add column if not exists payment_method text not null default 'bank_transfer'
 check(payment_method in ('bank_transfer','qris','virtual_account'));
alter table public.client_invoices
 add column if not exists payment_instructions text not null default '';
-- Channel is a preference only. QRIS/VA must NOT be described as live without provider integration.
create unique index if not exists client_invoices_one_per_contract
 on public.client_invoices(contract_id);
create or replace function public.gima_create_invoice_from_contract()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_number text;
begin
 if auth.uid() is null or not exists(
  select 1 from public.organization_members m
  where m.organization_id=new.organization_id and m.user_id=auth.uid()
    and m.role in ('owner','admin')
 ) then raise exception 'Not permitted to create contract invoice'; end if;
 if new.amount_idr<=0 then raise exception 'Contract amount must be positive for automatic invoice'; end if;
 v_number:='GIMA-'||upper(substr(replace(new.id::text,'-',''),1,12));
 insert into public.client_invoices(
   organization_id,contract_id,invoice_number,issued_on,due_on,amount_idr,status,payment_method
 ) values (
   new.organization_id,new.id,v_number,current_date,current_date+5,new.amount_idr,'issued','bank_transfer'
 );
 return new;
end $$;
drop trigger if exists gima_contract_auto_invoice on public.client_contracts;
create trigger gima_contract_auto_invoice
 after insert on public.client_contracts
 for each row execute function public.gima_create_invoice_from_contract();
revoke all on function public.gima_create_invoice_from_contract() from public,anon,authenticated;
-- Prevent forged verified payments and post-verification tampering.
create or replace function public.gima_guard_payment_changes()
returns trigger language plpgsql set search_path=''
as $$
begin
 if tg_op='INSERT' then
  if new.status<>'pending' then raise exception 'Payments must begin pending'; end if;
 elsif tg_op='UPDATE' then
  if old.status<>'pending' then raise exception 'Final payment cannot be edited'; end if;
  if new.id is distinct from old.id or new.organization_id is distinct from old.organization_id
    or new.invoice_id is distinct from old.invoice_id or new.amount_idr is distinct from old.amount_idr
    or new.paid_on is distinct from old.paid_on or new.transfer_reference is distinct from old.transfer_reference
    or new.created_at is distinct from old.created_at then
   raise exception 'Only payment status can be updated';
  end if;
  if new.status not in ('verified','rejected') then raise exception 'Invalid status transition'; end if;
  if not exists(select 1 from public.organization_members m where m.organization_id=old.organization_id
    and m.user_id=auth.uid() and m.role='owner') then
    raise exception 'Only owner can verify payments';
  end if;
 end if;
 return new;
end $$;
drop trigger if exists gima_guard_payments on public.client_payments;
create trigger gima_guard_payments before insert or update on public.client_payments
 for each row execute function public.gima_guard_payment_changes();
-- Prevent changing invoice financial fields after issue; only payment channel/instructions are editable.
create or replace function public.gima_guard_invoice_updates()
returns trigger language plpgsql set search_path=''
as $$
begin
 if old.status='issued' and (
  new.organization_id is distinct from old.organization_id or
  new.contract_id is distinct from old.contract_id or
  new.invoice_number is distinct from old.invoice_number or
  new.issued_on is distinct from old.issued_on or
  new.due_on is distinct from old.due_on or
  new.amount_idr is distinct from old.amount_idr or
  new.created_at is distinct from old.created_at
 ) then raise exception 'Issued invoice financial details are immutable'; end if;
 return new;
end $$;
drop trigger if exists gima_guard_invoice_changes on public.client_invoices;
create trigger gima_guard_invoice_changes before update on public.client_invoices
 for each row execute function public.gima_guard_invoice_updates();
commit;
