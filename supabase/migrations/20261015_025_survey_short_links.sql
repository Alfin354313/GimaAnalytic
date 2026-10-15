-- Run in Supabase SQL Editor after the existing survey foundation/public RPC.
-- Existing UUID links continue to work. No anonymous table access is added.
begin;
alter table public.surveys add column if not exists slug text;
alter table public.surveys drop constraint if exists surveys_slug_format;
alter table public.surveys add constraint surveys_slug_format check (
 slug is null or (length(slug) between 3 and 64 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
create unique index if not exists surveys_slug_unique on public.surveys(slug) where slug is not null;

create or replace function public.gima_guard_survey_slug()
returns trigger language plpgsql security definer set search_path = '' as $$
declare base text;
begin
 if tg_op = 'INSERT' and new.slug is null then
  base := trim(both '-' from left(regexp_replace(lower(new.title),'[^a-z0-9]+','-','g'),64));
  if length(base)<3 then base := 'survei'; end if;
  -- Serialize automatic generation for identical themes. The unique index also
  -- handles concurrent custom names and prevents ambiguous public routing.
  perform pg_advisory_xact_lock(hashtextextended(base,0));
  if exists(select 1 from public.surveys where slug=base) then
   base := left(base,31)||'-'||replace(new.id::text,'-','');
  end if;
  new.slug := base;
 elsif tg_op = 'UPDATE' and new.slug is distinct from old.slug then
  if old.status <> 'draft' and (old.status <> 'published' or old.slug is not null or new.slug is null) then
   raise exception 'Published survey link is locked';
  end if;
 end if;
 return new;
end;$$;
revoke all on function public.gima_guard_survey_slug() from public,anon,authenticated;
drop trigger if exists gima_guard_survey_slug on public.surveys;
create trigger gima_guard_survey_slug before insert or update of slug on public.surveys
for each row execute function public.gima_guard_survey_slug();

create or replace function public.gima_public_survey_by_slug(p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
 select public.gima_public_survey(s.id) from public.surveys s
 where s.slug=p_slug and s.status='published'
 and length(p_slug) between 3 and 64 and p_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$';
$$;
revoke all on function public.gima_public_survey_by_slug(text) from public;
grant execute on function public.gima_public_survey_by_slug(text) to anon,authenticated;
notify pgrst,'reload schema';
commit;
