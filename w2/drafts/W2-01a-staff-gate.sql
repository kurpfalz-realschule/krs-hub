-- LOCAL candidate only. S-2/Signup/Restore gates remain OPEN.
-- No changes to users/storage/untis policies belonging to S-2.
begin;
do $$ begin
  if to_regclass('w2_test.environment') is null then raise exception 'isolated W2 test environment required'; end if;
  if exists(select 1 from public.users where auth_id is null) then raise exception 'unlinked staff: resolve first'; end if;
end $$;
-- Definer is necessary here: users SELECT policies call this identity lookup.
create or replace function public.get_app_user_id() returns bigint
language sql stable security definer set search_path='' as $$
  select u.id from public.users u where u.auth_id=auth.uid() and coalesce(u.status,'active')='active' limit 1
$$;
create function public.is_staff() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.users u where u.auth_id=auth.uid() and coalesce(u.status,'active')='active')
$$;
create or replace function public.is_global_admin() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.users u where u.auth_id=auth.uid() and u.role in ('admin','owner') and coalesce(u.status,'active')='active')
$$;
create or replace function public.is_platform_owner() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.users u where u.auth_id=auth.uid() and u.role='owner' and coalesce(u.status,'active')='active')
$$;
revoke all on function public.get_app_user_id(), public.is_staff(), public.is_global_admin(), public.is_platform_owner() from public, anon;
grant execute on function public.get_app_user_id(), public.is_staff(), public.is_global_admin(), public.is_platform_owner() to authenticated;
alter policy koffer_select on public.koffer_physisch using ((select public.is_staff()));
alter policy stundenraster_select on public.stundenraster using ((select public.is_staff()));
-- Synthetic pseudodomain; choose/validate school-specific value before migration.
alter table public.users add constraint users_email_not_student_domain check (email is null or email not ilike '%@student.w2.invalid');
create or replace function public.auto_link_app_user() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if lower(new.email) like '%@student.w2.invalid' then return new; end if;
  update public.users set auth_id=new.id, auth_uid=new.id where lower(email)=lower(new.email) and auth_id is null;
  return new;
end $$;
create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if lower(new.email) like '%@student.w2.invalid' then return new; end if;
  update public.users set auth_uid=new.id where email=new.email and auth_uid is null;
  return new;
end $$;
revoke all on function public.auto_link_app_user(), public.handle_new_auth_user() from public, anon, authenticated;
commit;
