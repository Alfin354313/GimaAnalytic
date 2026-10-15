-- Read-only customer directory and exact organization counters for Super Admin.
create or replace function public.gima_platform_customer_directory()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_rows jsonb; v_active bigint; v_pending bigint;
begin
 if auth.uid() is null or not exists(select 1 from public.gima_platform_admins a where a.user_id=auth.uid()) then
  raise exception 'Forbidden' using errcode='42501';
 end if;
 select count(*) into v_active from public.organizations o where exists(
  select 1 from public.gima_organization_subscriptions s where s.organization_id=o.id and s.status='active' and s.approved_at is not null
   and s.starts_on<=(now() at time zone 'Asia/Jakarta')::date and s.ends_on>=(now() at time zone 'Asia/Jakarta')::date
 );
 select count(*) into v_pending from public.organizations o where exists(select 1 from public.gima_subscription_requests r where r.organization_id=o.id and r.status='pending');
 select coalesce(jsonb_agg(x order by x.name,x.id),'[]'::jsonb) into v_rows from (
  select o.id,o.name,last_sub.plan_name as latest_plan,last_sub.starts_on,last_sub.ends_on,
   (select count(*) from public.gima_subscription_requests r where r.organization_id=o.id and r.status='pending') as pending_requests,
   case when exists(select 1 from public.gima_organization_subscriptions s where s.organization_id=o.id and s.status='active' and s.approved_at is not null and s.starts_on<=(now() at time zone 'Asia/Jakarta')::date and s.ends_on>=(now() at time zone 'Asia/Jakarta')::date) then 'active'
    when last_sub.status in ('active','expired') and last_sub.ends_on<(now() at time zone 'Asia/Jakarta')::date then 'expired'
    when last_sub.id is null then 'none'
    when last_sub.status='active' then 'pending'
    else last_sub.status end as subscription_state
  from public.organizations o
  left join lateral (
   select s.id,p.name as plan_name,s.status,s.starts_on,s.ends_on
   from public.gima_organization_subscriptions s join public.gima_subscription_plans p on p.id=s.plan_id
   where s.organization_id=o.id order by s.created_at desc,s.id desc limit 1
  ) last_sub on true
  order by o.name,o.id limit 100
 ) x;
 return jsonb_build_object('organization_count',(select count(*) from public.organizations),'active_organization_count',v_active,'pending_organization_count',v_pending,'customers',v_rows);
end;
$$;
revoke all on function public.gima_platform_customer_directory() from public,anon;
grant execute on function public.gima_platform_customer_directory() to authenticated;
