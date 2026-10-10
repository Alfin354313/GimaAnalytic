-- GIMA Phase 8: conservative database-side submission throttle.
-- Run in Supabase SQL Editor AFTER verifying the Phase 7 public submission works.
-- Applies per-survey cap of 30 accepted submissions per rolling 60-second window.
-- This is NOT per-person uniqueness, IP-based rate limiting or bot protection.
-- IMPORTANT: Run once; review before rerunning. Does not delete existing responses.
begin;
create table if not exists public.gima_submission_throttle (
  survey_id uuid not null references public.surveys(id) on delete cascade,
  submitted_at timestamptz not null default clock_timestamp()
);
create index if not exists gima_throttle_survey_time
  on public.gima_submission_throttle(survey_id, submitted_at desc);
alter table public.gima_submission_throttle enable row level security;
revoke all on public.gima_submission_throttle from public, anon, authenticated;
-- Preserve existing function as private implementation; public callers must use wrapper.
do $$
begin
 if to_regprocedure('public.gima_submit_survey(uuid,jsonb,boolean)') is null then
   raise exception 'Missing public.gima_submit_survey(uuid,jsonb,boolean). Install Phase 7 first.';
 end if;
 if (select p.prorettype from pg_catalog.pg_proc p where p.oid=to_regprocedure('public.gima_submit_survey(uuid,jsonb,boolean)')) <> 'uuid'::regtype then
   raise exception 'Public submission function does not return uuid. Inspect existing return type before installing Phase 8.';
 end if;
 if to_regprocedure('public.gima_submit_survey_internal_phase8(uuid,jsonb,boolean)') is not null then
   raise exception 'Phase 8 throttle already installed. Do not rerun migration.';
 end if;
 alter function public.gima_submit_survey(uuid,jsonb,boolean)
   rename to gima_submit_survey_internal_phase8;
end $$;
revoke all on function public.gima_submit_survey_internal_phase8(uuid,jsonb,boolean)
 from public, anon, authenticated;
create function public.gima_submit_survey(
 p_survey_id uuid, p_answers jsonb, p_consented boolean
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_result uuid; v_count integer;
begin
 if p_survey_id is null then raise exception 'Survei tidak valid'; end if;
 if p_consented is distinct from true then raise exception 'Persetujuan diperlukan'; end if;
 if p_answers is null or jsonb_typeof(p_answers) <> 'array'
    or jsonb_array_length(p_answers) > 500
    or pg_catalog.octet_length(p_answers::text) > 65536 then
   raise exception 'Format atau ukuran jawaban tidak valid';
 end if;
 -- Serialize submissions to the same survey so parallel requests cannot evade the cap.
 perform pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended(p_survey_id::text, 20261010)
 );
 select count(*) into v_count
 from public.gima_submission_throttle
 where survey_id=p_survey_id
   and submitted_at > pg_catalog.clock_timestamp()-interval '60 seconds';
 if v_count >= 30 then
   raise exception 'Terlalu banyak pengiriman untuk survei ini. Coba lagi dalam satu menit.';
 end if;
 -- Existing function remains responsible for survey status, consent and answer validation.
 v_result:=public.gima_submit_survey_internal_phase8(p_survey_id,p_answers,p_consented);
 insert into public.gima_submission_throttle(survey_id) values (p_survey_id);
 return v_result;
end $$;
revoke all on function public.gima_submit_survey(uuid,jsonb,boolean) from public;
grant execute on function public.gima_submit_survey(uuid,jsonb,boolean)
 to anon, authenticated;
commit;
-- To check: SELECT proname, prosecdef FROM pg_proc WHERE proname LIKE 'gima_submit_survey%';
