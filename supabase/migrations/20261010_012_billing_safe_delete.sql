-- GIMA: Safe deletion of erroneous billing records (Preview)
-- Run after migrations 009 and 010.
-- Verified/rejected payment records and invoices with such records cannot be deleted.
begin;
create or replace function public.gima_guard_billing_deletions()
returns trigger language plpgsql set search_path=''
as $$
begin
 if auth.uid() is null or not exists (
   select 1 from public.organization_members m
   where m.organization_id=old.organization_id and m.user_id=auth.uid() and m.role='owner'
 ) then raise exception 'Only organization owner may delete billing records'; end if;
 if tg_table_name='client_payments' then
   if old.status<>'pending' then raise exception 'Only pending payment entries may be deleted'; end if;
 elsif tg_table_name='client_invoices' then
   if exists(select 1 from public.client_payments p where p.invoice_id=old.id) then
     raise exception 'Remove pending payment entries first; verified/rejected records are retained';
   end if;
 elsif tg_table_name='client_contracts' then
   if exists(select 1 from public.client_invoices i where i.contract_id=old.id) then
     raise exception 'Delete invoice first before deleting contract';
   end if;
 end if;
 return old;
end $$;
drop trigger if exists gima_guard_payment_deletions on public.client_payments;
create trigger gima_guard_payment_deletions before delete on public.client_payments
 for each row execute function public.gima_guard_billing_deletions();
drop trigger if exists gima_guard_invoice_deletions on public.client_invoices;
create trigger gima_guard_invoice_deletions before delete on public.client_invoices
 for each row execute function public.gima_guard_billing_deletions();
drop trigger if exists gima_guard_contract_deletions on public.client_contracts;
create trigger gima_guard_contract_deletions before delete on public.client_contracts
 for each row execute function public.gima_guard_billing_deletions();
-- Grant DELETE exclusively to owners through RLS.
create policy billing_delete_pending_owner on public.client_payments for delete to authenticated
 using(status='pending' and exists(select 1 from public.organization_members m
 where m.organization_id=client_payments.organization_id and m.user_id=(select auth.uid()) and m.role='owner'));
create policy billing_delete_invoice_owner on public.client_invoices for delete to authenticated
 using(exists(select 1 from public.organization_members m where m.organization_id=client_invoices.organization_id
 and m.user_id=(select auth.uid()) and m.role='owner'));
create policy billing_delete_contract_owner on public.client_contracts for delete to authenticated
 using(exists(select 1 from public.organization_members m where m.organization_id=client_contracts.organization_id
 and m.user_id=(select auth.uid()) and m.role='owner'));
grant delete on public.client_payments,public.client_invoices,public.client_contracts to authenticated;
commit;
