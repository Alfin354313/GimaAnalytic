-- GIMA Phase 7: invitation-gated submission.
-- Run after 20261010_004 and the prior gima_submit_survey function.
-- Invitation tokens must be created by trusted SQL/admin only; never client-side.
create table if not exists public.survey_invitations (
 id uuid primary key default gen_random_uuid(),
 survey_id uuid not null references public.surveys(id) on delete cascade,
 token_hash text not null unique,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now() + interval '14 days'),
 used_at timestamptz,
 response_id uuid unique references public.survey_responses(id),
 constraint gima_invitation_token_format check (token_hash ~ '^[0-9a-f]{64}$')
);
create index if not exists idx_gima_invite_survey on public.survey_invitations(survey_id);
alter table public.survey_invitations enable row level security;
revoke all on public.survey_invitations from anon, authenticated;
-- Do not expose raw invitation codes in SELECT results.
-- This SQL Editor function generates a one-time code. Copy returned code securely.
create or replace function public.gima_create_invitation(p_survey_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_code text;
begin
 if current_user not in ('postgres','supabase_admin') then
   raise exception 'Only trusted database administrator may issue invitations';
 end if;
 if not exists(select 1 from public.surveys where id=p_survey_id and status='published') then
   raise exception 'Survey must be published';
 end if;
 v_code:=encode(extensions.gen_random_bytes(32),'hex');
 insert into public.survey_invitations(survey_id,token_hash)
 values(p_survey_id,encode(extensions.digest(v_code,'sha256'),'hex'));
 return v_code;
end;$$;
revoke all on function public.gima_create_invitation(uuid) from public,anon,authenticated;
-- Atomic, one-time submission. No direct table writes are granted to respondents.
create or replace function public.gima_submit_invited_survey(
 p_survey_id uuid, p_token text, p_answers jsonb, p_consented boolean
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_invite uuid; v_response uuid; v_count integer;
begin
 if p_consented is distinct from true then raise exception 'Persetujuan diperlukan'; end if;
 if p_token is null or p_token !~ '^[0-9a-f]{64}$' then raise exception 'Kode undangan tidak valid'; end if;
 select id into v_invite from public.survey_invitations
 where survey_id=p_survey_id and token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
 and used_at is null and expires_at>now()
 for update;
 if v_invite is null then raise exception 'Undangan sudah digunakan, kedaluwarsa, atau tidak valid'; end if;
 if not exists(select 1 from public.surveys where id=p_survey_id and status='published') then
   raise exception 'Survei tidak aktif';
 end if;
 if p_answers is null or jsonb_typeof(p_answers)<>'array' then raise exception 'Jawaban tidak valid'; end if;
 select count(*) into v_count from public.survey_questions where survey_id=p_survey_id;
 if v_count=0 or jsonb_array_length(p_answers)<>v_count then raise exception 'Semua pertanyaan wajib dijawab'; end if;
 if exists (
  select 1 from jsonb_array_elements(p_answers) item
  where jsonb_typeof(item)<>'object'
   or coalesce(item->>'question_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or coalesce(item->>'score','') !~ '^[1-5]$'
 ) then raise exception 'Format jawaban salah'; end if;
 if (select count(distinct item->>'question_id') from jsonb_array_elements(p_answers) item)<>v_count
 or exists(select 1 from jsonb_array_elements(p_answers) item
   where not exists(select 1 from public.survey_questions q
   where q.id=(item->>'question_id')::uuid and q.survey_id=p_survey_id))
 then raise exception 'Pertanyaan tidak cocok'; end if;
 insert into public.survey_responses(survey_id,consented) values(p_survey_id,true) returning id into v_response;
 insert into public.survey_answers(response_id,question_id,score)
 select v_response,(item->>'question_id')::uuid,(item->>'score')::integer
 from jsonb_array_elements(p_answers) item;
 update public.survey_invitations set used_at=now(),response_id=v_response where id=v_invite;
 return v_response;
end;$$;
revoke all on function public.gima_submit_invited_survey(uuid,text,jsonb,boolean) from public;
grant execute on function public.gima_submit_invited_survey(uuid,text,jsonb,boolean) to anon,authenticated;
-- NOTE: one-time tokens prevent reuse, but do not replace IP-level rate limiting / CAPTCHA.
