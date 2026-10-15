-- Organization-scoped daily aggregate; no identities or answer content.
create or replace function public.gima_dashboard_daily_responses(p_organization_id uuid)
returns table(day date,response_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
 if not exists(select 1 from public.organization_members m where m.organization_id=p_organization_id and m.user_id=auth.uid()) then
  raise exception 'Akses organisasi ditolak' using errcode='42501';
 end if;
 return query
 with days as (
  select generate_series((now() at time zone 'UTC')::date-29,(now() at time zone 'UTC')::date,interval '1 day')::date as day
 ), totals as (
  select (r.submitted_at at time zone 'UTC')::date as day,count(*) as n
  from public.survey_responses r join public.surveys s on s.id=r.survey_id
  where s.organization_id=p_organization_id and r.consented=true
   and r.submitted_at>=(((now() at time zone 'UTC')::date-29)::timestamp at time zone 'UTC')
   and r.submitted_at<(((now() at time zone 'UTC')::date+1)::timestamp at time zone 'UTC')
  group by 1
 ) select d.day,coalesce(t.n,0)::bigint from days d left join totals t on t.day=d.day order by d.day;
end;
$$;
revoke all on function public.gima_dashboard_daily_responses(uuid) from public,anon;
grant execute on function public.gima_dashboard_daily_responses(uuid) to authenticated;
