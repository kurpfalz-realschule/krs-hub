-- Disposable minimal Postgres model, not a complete KRS/Supabase schema.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create schema w2_test;
create table w2_test.environment (synthetic_only boolean check (synthetic_only));
insert into w2_test.environment values(true);
create table auth.users(id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema public,auth to authenticated,anon;
grant execute on function auth.uid() to authenticated;
create table public.users(id bigint primary key,auth_id uuid,auth_uid uuid,email text,role text,status text);
create table public.koffer_physisch(id bigint primary key);
create table public.stundenraster(id bigint primary key);
insert into auth.users values
 ('00000000-0000-0000-0000-000000000001','t1@staff.w2.invalid'),
 ('00000000-0000-0000-0000-000000000002','admin@staff.w2.invalid'),
 ('00000000-0000-0000-0000-000000000003','disabled@staff.w2.invalid'),
 ('00000000-0000-0000-0000-000000000004','admin@staff.w2.invalid');
insert into public.users select 1,id,id,email,'member','active' from auth.users where id::text like '%001';
insert into public.users select 2,id,id,email,'admin','active' from auth.users where id::text like '%002';
insert into public.users select 3,id,id,email,'member','disabled' from auth.users where id::text like '%003';
insert into public.koffer_physisch values(1);
insert into public.stundenraster values(1);
alter table public.users enable row level security;
alter table public.koffer_physisch enable row level security;
alter table public.stundenraster enable row level security;
grant select on public.users,public.koffer_physisch,public.stundenraster to authenticated;
create function public.get_app_user_id() returns bigint language sql stable security definer set search_path=public as $$
select coalesce((select id from users where auth_id=auth.uid() limit 1),(select id from users where email=(select email from auth.users where id=auth.uid()) limit 1))
$$;
create function public.is_global_admin() returns boolean language sql stable security definer set search_path=public as $$
select exists(select 1 from users u where u.role in ('admin','owner') and (u.auth_id=auth.uid() or u.email=(select email from auth.users where id=auth.uid())))
$$;
create function public.is_platform_owner() returns boolean language sql stable security definer set search_path=public as $$
select exists(select 1 from users u where u.role='owner' and (u.auth_id=auth.uid() or u.email=(select email from auth.users where id=auth.uid())))
$$;
create function public.auto_link_app_user() returns trigger language plpgsql security definer set search_path=public as $$ begin update public.users set auth_id=new.id,auth_uid=new.id where lower(email)=lower(new.email) and auth_id is null; return new; end $$;
create function public.handle_new_auth_user() returns trigger language plpgsql security definer set search_path=public as $$ begin update public.users set auth_uid=new.id where email=new.email and auth_uid is null; return new; end $$;
create policy users_select_auth on public.users for select to authenticated using ((select public.get_app_user_id()) is not null);
create policy koffer_select on public.koffer_physisch for select to authenticated using ((select public.get_app_user_id()) is not null);
create policy stundenraster_select on public.stundenraster for select to authenticated using(true);
-- Capture exact synthetic originals for dependency-safe local undo verification.
create table w2_test.functions as select pg_get_functiondef(p.oid) ddl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public';
create table w2_test.policies as select tablename,policyname,qual from pg_policies where schemaname='public';
