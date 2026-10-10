-- GIMA Phase 11: owner-controlled membership administration
-- REVIEW FIRST. Execute manually in Supabase SQL Editor; do not expose service role.
-- Users must already exist in Supabase Auth; no email lookup is exposed.
begin;
create or replace function public.gima_list_organization_members(p_organization_id uuid)
returns table(user_id uuid, role text, created_at timestamptz)
language plpgsql security definer set search_path=''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.organization_members m
    where m.organization_id=p_organization_id and m.user_id=auth.uid()
  ) then raise exception 'Not a member of this organization'; end if;
  return query
    select m.user_id,m.role,m.created_at from public.organization_members m
    where m.organization_id=p_organization_id order by m.created_at,m.user_id;
end $$;
create or replace function public.gima_add_organization_member(
 p_organization_id uuid,p_user_id uuid,p_role text
) returns void
language plpgsql security definer set search_path=''
as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_organization_id is null or p_user_id is null or p_role not in ('admin','analyst') or p_role is null then
   raise exception 'Invalid membership input';
 end if;
 -- Serialize membership changes for a given organization.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text,20261011));
 if not exists (
   select 1 from public.organization_members m
   where m.organization_id=p_organization_id and m.user_id=auth.uid() and m.role='owner'
 ) then raise exception 'Only an organization owner may add members'; end if;
 if not exists(select 1 from auth.users u where u.id=p_user_id) then
   raise exception 'Account does not exist. Ask the user to register first';
 end if;
 insert into public.organization_members(organization_id,user_id,role)
 values(p_organization_id,p_user_id,p_role);
end $$;
revoke all on function public.gima_list_organization_members(uuid) from public,anon;
revoke all on function public.gima_add_organization_member(uuid,uuid,text) from public,anon;
grant execute on function public.gima_list_organization_members(uuid) to authenticated;
grant execute on function public.gima_add_organization_member(uuid,uuid,text) to authenticated;
commit;
-- IMPORTANT: existing RLS policies stay in place. No direct membership writes granted.
