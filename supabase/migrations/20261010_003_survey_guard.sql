-- Phase 6 security hardening. Run in Supabase SQL Editor once.
-- Protect tenant ownership and published survey content even if a client
-- bypasses the dashboard UI. Existing RLS policies remain in effect.
create or replace function public.gima_guard_survey_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.organization_id is distinct from old.organization_id
     or new.created_by is distinct from old.created_by
     or new.id is distinct from old.id then
    raise exception 'Survey ownership cannot be changed';
  end if;
  if old.status = 'draft' then
    if new.status not in ('draft','published') then
      raise exception 'Draft may only remain draft or be published';
    end if;
  elsif old.status = 'published' then
    if new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.status not in ('published','closed') then
      raise exception 'Published survey content is locked';
    end if;
  else
    raise exception 'Closed survey cannot be modified';
  end if;
  return new;
end;
$$;
drop trigger if exists gima_guard_survey_update on public.surveys;
create trigger gima_guard_survey_update
before update on public.surveys
for each row execute function public.gima_guard_survey_update();

-- Public response submission is still intentionally disabled.
