-- Full-platform aggregates, exclusively available to authorized platform admins.
create or replace function public.gima_platform_overview_charts()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_months jsonb; v_status jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.gima_platform_admins a where a.user_id=auth.uid()) then
  raise exception 'Forbidden' using errcode='42501';
 end if;
 with months as (
  select generate_series(date_trunc('month',now() at time zone 'UTC')-interval '5 months',date_trunc('month',now() at time zone 'UTC'),interval '1 month')::date as month
 ), counts as (
  select date_trunc('month',r.created_at at time zone 'UTC')::date as month,count(*) as n
  from public.gima_subscription_requests r
  where r.created_at>=(date_trunc('month',now() at time zone 'UTC')-interval '5 months') at time zone 'UTC'
   and r.created_at<(date_trunc('month',now() at time zone 'UTC')+interval '1 month') at time zone 'UTC'
  group by 1
 ) select coalesce(jsonb_agg(jsonb_build_object('month',m.month,'request_count',coalesce(c.n,0)) order by m.month),'[]'::jsonb)
 into v_months from months m left join counts c on c.month=m.month;
 with classified as (
  select o.id,
   case when exists(select 1 from public.gima_organization_subscriptions s where s.organization_id=o.id and s.status='active' and s.approved_at is not null and s.starts_on<=(now() at time zone 'Asia/Jakarta')::date and s.ends_on>=(now() at time zone 'Asia/Jakarta')::date) then 'active'
   when latest.ends_on<(now() at time zone 'Asia/Jakarta')::date and latest.status in ('active','expired') then 'expired'
   else 'other' end as state
  from public.organizations o
  left join lateral(select s.ends_on,s.status from public.gima_organization_subscriptions s where s.organization_id=o.id order by s.created_at desc,s.id desc limit 1) latest on true
 ) select jsonb_build_object('active',count(*) filter(where state='active'),'expired',count(*) filter(where state='expired'),'other',count(*) filter(where state='other')) into v_status from classified;
 return jsonb_build_object('monthly_requests',v_months,'organization_status',v_status);
end;
$$;
revoke all on function public.gima_platform_overview_charts() from public,anon;
grant execute on function public.gima_platform_overview_charts() to authenticated;
