-- Aggregate only: no respondent identities or answers leave the function.
create or replace function public.gima_dashboard_monthly_responses(p_organization_id uuid)
returns table(month date,response_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
 if not exists(select 1 from public.organization_members m where m.organization_id=p_organization_id and m.user_id=auth.uid()) then
  raise exception 'Akses organisasi ditolak' using errcode='42501';
 end if;
 return query
 with months as (
  select generate_series(date_trunc('month',now() at time zone 'UTC')-interval '5 months',date_trunc('month',now() at time zone 'UTC'),interval '1 month')::date as month
 ), totals as (
  select date_trunc('month',r.submitted_at at time zone 'UTC')::date as month,count(*) as n
  from public.survey_responses r join public.surveys s on s.id=r.survey_id
  where s.organization_id=p_organization_id and r.consented=true
   and r.submitted_at >= (date_trunc('month',now() at time zone 'UTC')-interval '5 months') at time zone 'UTC'
   and r.submitted_at < (date_trunc('month',now() at time zone 'UTC')+interval '1 month') at time zone 'UTC'
  group by 1
 ) select m.month,coalesce(t.n,0)::bigint from months m left join totals t on t.month=m.month order by m.month;
end;
$$;
revoke all on function public.gima_dashboard_monthly_responses(uuid) from public,anon;
grant execute on function public.gima_dashboard_monthly_responses(uuid) to authenticated;

create or replace function public.gima_dashboard_survey_counts(p_organization_id uuid)
returns table(survey_id uuid,response_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
 if not exists(select 1 from public.organization_members m where m.organization_id=p_organization_id and m.user_id=auth.uid()) then
  raise exception 'Akses organisasi ditolak' using errcode='42501';
 end if;
 return query select s.id,count(r.id)::bigint
 from public.surveys s left join public.survey_responses r on r.survey_id=s.id and r.consented=true
 where s.organization_id=p_organization_id group by s.id;
end;
$$;
revoke all on function public.gima_dashboard_survey_counts(uuid) from public,anon;
grant execute on function public.gima_dashboard_survey_counts(uuid) to authenticated;
