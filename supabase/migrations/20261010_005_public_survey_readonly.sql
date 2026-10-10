-- Public survey metadata only. No access to responses, members, or drafts.
create or replace function public.gima_public_survey(p_survey_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare result jsonb;
begin
 select jsonb_build_object('id',s.id,'title',s.title,'description',s.description,
 'questions',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'prompt',q.prompt,'position',q.position) order by q.position)
 from public.survey_questions q where q.survey_id=s.id),'[]'::jsonb))
 into result from public.surveys s
 where s.id=p_survey_id and s.status='published';
 return result;
end;$$;
revoke all on function public.gima_public_survey(uuid) from public;
grant execute on function public.gima_public_survey(uuid) to anon,authenticated;
-- IMPORTANT: survey answers remain disabled until protected submission exists.
