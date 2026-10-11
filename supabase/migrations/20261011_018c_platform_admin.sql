-- Phase 18C: separate platform super-admin; execute in Supabase SQL Editor.
-- SECURITY: do not add a user ID until that separate Supabase Auth account exists.
begin;
create table if not exists public.gima_platform_admins(
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.gima_platform_admins enable row level security;
revoke all on public.gima_platform_admins from anon,authenticated;
-- Membership is checked inside SECURITY DEFINER RPCs, never from browser-accessible table queries.
create or replace function public.gima_platform_pending_requests()
returns table(request_id uuid, organization_id uuid, organization_name text, plan_name text, transfer_reference text, transfer_date date, requested_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
begin
 if auth.uid() is null or not exists(select 1 from public.gima_platform_admins a where a.user_id=auth.uid()) then
   raise exception 'Forbidden' using errcode='42501';
 end if;
 return query
 select r.id,r.organization_id,o.name::text,p.name::text,r.transfer_reference,r.transfer_date,r.created_at
 from public.gima_subscription_requests r
 join public.organizations o on o.id=r.organization_id
 join public.gima_subscription_plans p on p.id=r.plan_id
 where r.status='pending'
 order by r.created_at asc limit 200;
end $$;
create or replace function public.gima_platform_review_request(p_request_id uuid,p_approve boolean,p_notes text default '')
returns text language plpgsql security definer set search_path = ''
as $$
declare v_request public.gima_subscription_requests%rowtype;
        v_months int; v_start date; v_end date; v_sub uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.gima_platform_admins a where a.user_id=auth.uid()) then
  raise exception 'Forbidden' using errcode='42501';
 end if;
 if p_request_id is null or p_approve is null then raise exception 'Invalid request'; end if;
 if length(coalesce(p_notes,''))>2000 then raise exception 'Notes too long'; end if;
 select * into v_request from public.gima_subscription_requests where id=p_request_id and status='pending' for update;
 if not found then raise exception 'Request not pending'; end if;
 if not p_approve then
   update public.gima_subscription_requests set status='rejected' where id=p_request_id;
   return 'rejected';
 end if;
 -- Human operator must independently check the bank statement before approving.
 select duration_months into v_months from public.gima_subscription_plans where id=v_request.plan_id and is_active=true;
 if v_months is null then raise exception 'Plan unavailable'; end if;
 v_start=(now() at time zone 'Asia/Jakarta')::date;
 v_end=(v_start + make_interval(months=>v_months))::date - 1;
 select id into v_sub from public.gima_organization_subscriptions
 where organization_id=v_request.organization_id and status in ('pending','active','suspended') for update;
 if v_sub is not null then
  update public.gima_organization_subscriptions set plan_id=v_request.plan_id,status='active',starts_on=v_start,ends_on=v_end,
    approved_by=auth.uid(),approved_at=now(),notes=coalesce(p_notes,''),updated_at=now() where id=v_sub;
 else
  insert into public.gima_organization_subscriptions(organization_id,plan_id,status,starts_on,ends_on,approved_by,approved_at,notes)
  values(v_request.organization_id,v_request.plan_id,'active',v_start,v_end,auth.uid(),now(),coalesce(p_notes,''));
 end if;
 update public.gima_subscription_requests set status='approved' where id=p_request_id;
 return 'approved';
end $$;
revoke all on function public.gima_platform_pending_requests() from public,anon;
revoke all on function public.gima_platform_review_request(uuid,boolean,text) from public,anon;
grant execute on function public.gima_platform_pending_requests() to authenticated;
grant execute on function public.gima_platform_review_request(uuid,boolean,text) to authenticated;
commit;
-- AFTER creating a separate Auth account, authorize its exact UUID manually:
-- INSERT INTO public.gima_platform_admins(user_id) VALUES ('REPLACE_WITH_SEPARATE_AUTH_USER_UUID');
