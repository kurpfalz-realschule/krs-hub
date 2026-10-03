\set ON_ERROR_STOP on
begin;
-- Synthetic Auth without profile, sharing the admin email: must not inherit it.
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
do $$ begin
 if public.get_app_user_id() is not null or public.is_staff() or public.is_global_admin() or public.is_platform_owner() then raise exception 'orphan identity leak'; end if;
 if (select count(*) from public.users)<>0 or (select count(*) from public.koffer_physisch)<>0 or (select count(*) from public.stundenraster)<>0 then raise exception 'orphan rows leak'; end if;
 if (select count(*) from public.school_features)<>3 then raise exception 'flag read failed'; end if;
 if w2_private.feature_on('UNTERRICHT') or w2_private.feature_on('UNKNOWN') then raise exception 'flags must default off'; end if;
 begin update public.school_features set enabled=true; raise exception 'direct write allowed'; exception when insufficient_privilege then null; end;
 begin insert into public.school_features(key) values('BBB'); raise exception 'direct insert allowed'; exception when insufficient_privilege then null; end;
 begin delete from public.school_features; raise exception 'direct delete allowed'; exception when insufficient_privilege then null; end;
end $$;
-- Active teacher keeps baseline access.
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$ begin
 if public.get_app_user_id()<>1 or not public.is_staff() or public.is_global_admin() then raise exception 'teacher identity regression'; end if;
 if (select count(*) from public.koffer_physisch)<>1 or (select count(*) from public.stundenraster)<>1 then raise exception 'teacher rows regression'; end if;
end $$;
-- Disabled profile cannot return staff rows.
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$ begin
 if public.get_app_user_id() is not null or public.is_staff() or (select count(*) from public.users)<>0 or (select count(*) from public.stundenraster)<>0 then raise exception 'disabled account leak'; end if;
end $$;
-- Admin and no-session cases.
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$ begin if not public.is_global_admin() or public.is_platform_owner() then raise exception 'admin role regression'; end if; end $$;
set local request.jwt.claim.sub='';
do $$ begin if public.is_staff() or public.get_app_user_id() is not null then raise exception 'missing JWT leak'; end if; end $$;
reset role;
update public.school_features set enabled=true where key='UNTERRICHT';
set local role authenticated;
do $$ begin if not w2_private.feature_on('UNTERRICHT') then raise exception 'flag enable failed'; end if; end $$;
reset role;
set local role anon;
do $$ begin
 begin perform * from public.school_features; raise exception 'anonymous flags allowed'; exception when insufficient_privilege then null; end;
 begin perform public.is_staff(); raise exception 'anonymous helper allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
 begin insert into public.users(id,email,status) values(9,'S-Test-7a-01@student.w2.invalid','active'); raise exception 'pseudodomain accepted'; exception when check_violation then null; end;
end $$;
rollback;
select 'PASS: orphan / teacher / disabled / admin / missing JWT / anon / flags / writes / pseudodomain' result;
