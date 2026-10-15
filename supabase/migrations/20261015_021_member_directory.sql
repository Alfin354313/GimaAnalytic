-- Organization directory; email visible only to owner/admin of the same organization.
create or replace function public.gima_organization_member_directory(p_organization_id uuid)
returns table(user_id uuid,display_name text,email text,role text,created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
declare v_role text;
begin
 select m.role into v_role from public.organization_members m
 where m.organization_id=p_organization_id and m.user_id=auth.uid();
 if v_role is null then raise exception 'Akses organisasi ditolak' using errcode='42501'; end if;
 return query select m.user_id,
  nullif(left(coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name',''),160),'')::text,
  case when v_role in ('owner','admin') then u.email::text else null::text end,
  m.role::text,m.created_at
 from public.organization_members m join auth.users u on u.id=m.user_id
 where m.organization_id=p_organization_id order by m.created_at,m.user_id;
end;
$$;
revoke all on function public.gima_organization_member_directory(uuid) from public,anon;
grant execute on function public.gima_organization_member_directory(uuid) to authenticated;
