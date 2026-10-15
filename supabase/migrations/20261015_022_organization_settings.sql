begin;
create table if not exists public.gima_organization_profiles (
 organization_id uuid primary key references public.organizations(id) on delete cascade,
 contact_email text not null default '', industry text not null default '', address text not null default '',
 logo_data_url text, updated_at timestamptz not null default now(),
 constraint gima_org_profile_email_length check(length(contact_email)<=254),
 constraint gima_org_profile_industry_length check(length(industry)<=120),
 constraint gima_org_profile_address_length check(length(address)<=1000),
 constraint gima_org_profile_logo check(logo_data_url is null or (length(logo_data_url)<=2800000 and logo_data_url ~ '^data:image/(png|jpeg);base64,[A-Za-z0-9+/=]+$'))
);
alter table public.gima_organization_profiles enable row level security;
revoke all on public.gima_organization_profiles from anon,authenticated;
create or replace function public.gima_get_organization_profile(p_organization_id uuid)
returns table(name text,contact_email text,industry text,address text,logo_data_url text)
language plpgsql stable security definer set search_path=''
as $$
begin
 if not exists(select 1 from public.organization_members m where m.organization_id=p_organization_id and m.user_id=auth.uid()) then raise exception 'Akses ditolak' using errcode='42501'; end if;
 return query select o.name,coalesce(p.contact_email,''),coalesce(p.industry,''),coalesce(p.address,''),p.logo_data_url
 from public.organizations o left join public.gima_organization_profiles p on p.organization_id=o.id where o.id=p_organization_id;
end;
$$;
create or replace function public.gima_save_organization_profile(p_organization_id uuid,p_name text,p_contact_email text,p_industry text,p_address text,p_logo_data_url text)
returns void language plpgsql security definer set search_path=''
as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_organization_id::text,20261015));
 if not exists(select 1 from public.organization_members m where m.organization_id=p_organization_id and m.user_id=auth.uid() and m.role in ('owner','admin')) then raise exception 'Akses ditolak' using errcode='42501'; end if;
 if p_name is null or length(trim(p_name)) not between 2 and 160 then raise exception 'Nama organisasi tidak valid'; end if;
 update public.organizations set name=trim(p_name) where id=p_organization_id;
 insert into public.gima_organization_profiles(organization_id,contact_email,industry,address,logo_data_url)
 values(p_organization_id,coalesce(trim(p_contact_email),''),coalesce(trim(p_industry),''),coalesce(trim(p_address),''),p_logo_data_url)
 on conflict(organization_id) do update set contact_email=excluded.contact_email,industry=excluded.industry,address=excluded.address,logo_data_url=excluded.logo_data_url,updated_at=now();
end;
$$;
revoke all on function public.gima_get_organization_profile(uuid) from public,anon;
revoke all on function public.gima_save_organization_profile(uuid,text,text,text,text,text) from public,anon;
grant execute on function public.gima_get_organization_profile(uuid) to authenticated;
grant execute on function public.gima_save_organization_profile(uuid,text,text,text,text,text) to authenticated;
commit;
