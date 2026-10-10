-- GIMA Analytics Phase 7: private response storage and privacy-safe aggregation.
-- Run only after phase 5 and 6 migrations. Public submissions intentionally disabled
-- until one-time access tokens and rate limiting are implemented.
create table if not exists public.survey_responses (
 id uuid primary key default gen_random_uuid(),
 survey_id uuid not null references public.surveys(id) on delete cascade,
 submitted_at timestamptz not null default now(),
 consented boolean not null check (consented = true)
);
create table if not exists public.survey_answers (
 response_id uuid not null references public.survey_responses(id) on delete cascade,
 question_id uuid not null references public.survey_questions(id) on delete cascade,
 score integer not null check (score between 1 and 5),
 primary key(response_id,question_id)
);
create index if not exists idx_gima_responses_survey on public.survey_responses(survey_id);
create index if not exists idx_gima_answers_question on public.survey_answers(question_id);
alter table public.survey_responses enable row level security;
alter table public.survey_answers enable row level security;
-- No client-side SELECT/INSERT/UPDATE/DELETE policies: all access is denied.
-- Aggregated results are exposed only to members through a controlled RPC.
create or replace function public.gima_survey_summary(p_survey_id uuid)
returns table (question_id uuid, question_prompt text, response_count bigint, average_score numeric)
language plpgsql security definer set search_path = ''
as $$
begin
 if (select auth.uid()) is null or not exists (
   select 1 from public.surveys s
   join public.organization_members m on m.organization_id=s.organization_id
   where s.id=p_survey_id and m.user_id=(select auth.uid())
 ) then
   raise exception 'Access denied';
 end if;
 return query
 select q.id, q.prompt,
   case when count(a.score)>=5 then count(a.score) else 0::bigint end,
   case when count(a.score)>=5 then round(avg(a.score)::numeric,2) else null::numeric end
 from public.survey_questions q
 left join public.survey_answers a on a.question_id=q.id
 left join public.survey_responses r on r.id=a.response_id and r.survey_id=p_survey_id
 where q.survey_id=p_survey_id
 group by q.id,q.position,q.prompt
 order by q.position;
end;$$;
revoke all on function public.gima_survey_summary(uuid) from public,anon;
grant execute on function public.gima_survey_summary(uuid) to authenticated;
-- Minimum 5 answers per question before scores are revealed.
-- Do not insert real respondents until consent, abuse protection, and invitations exist.
