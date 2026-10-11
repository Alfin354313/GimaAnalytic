-- Phase 18D: platform dashboard read-only summary, server-authorized.
begin;
create or replace function public.gima_platform_dashboard()
returns jsonb language plpgsql security definer set search_path=''
as $$
declare result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.gima_platform_admins a where a.user_id=auth.uid()) then
  raise exception 'Forbidden' using errcode='42501';
 end if;
 select jsonb_build_object(
  'organization_count',(select count(*) from public.organizations),
  'pending_count',(select count(*) from public.gima_subscription_requests where status='pending'),
  'active_count',(select count(*) from public.gima_organization_subscriptions where status='active' and starts_on <= (now() at time zone 'Asia/Jakarta')::date and ends_on >= (now() at time zone 'Asia/Jakarta')::date and approved_at is not null),
  'reviewed_count',(select count(*) from public.gima_subscription_requests where status in ('approved','rejected')),
  'subscriptions',coalesce((select jsonb_agg(x order by x.created_at desc) from (
   select s.id,s.organization_id,o.name as organization_name,p.name as plan_name,s.status,s.starts_on,s.ends_on,s.approved_at,s.created_at
   from public.gima_organization_subscriptions s
   join public.organizations o on o.id=s.organization_id
   join public.gima_subscription_plans p on p.id=s.plan_id
   order by s.created_at desc limit 100
  ) x),'[]'::jsonb),
  'history',coalesce((select jsonb_agg(x order by x.created_at desc) from (
   select r.id,o.name as organization_name,p.name as plan_name,r.status,r.transfer_reference,r.transfer_date,r.created_at
   from public.gima_subscription_requests r
   join public.organizations o on o.id=r.organization_id
   join public.gima_subscription_plans p on p.id=r.plan_id
   where r.status in ('approved','rejected')
   order by r.created_at desc limit 100
  ) x),'[]'::jsonb),
  'customers',coalesce((select jsonb_agg(x order by x.name) from (
   select o.id,o.name,
   (select count(*) from public.gima_subscription_requests r where r.organization_id=o.id and r.status='pending') as pending_requests,
   (select p.name from public.gima_organization_subscriptions s join public.gima_subscription_plans p on p.id=s.plan_id where s.organization_id=o.id order by s.created_at desc limit 1) as latest_plan
   from public.organizations o order by o.name limit 100
  ) x),'[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function public.gima_platform_dashboard() from public,anon;
grant execute on function public.gima_platform_dashboard() to authenticated;
commit;
