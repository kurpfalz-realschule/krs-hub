-- ONLY the disposable local harness; never a production rollback.
begin;
do $$ declare r record; begin
 if to_regclass('w2_test.functions') is null then raise exception 'local snapshots required'; end if;
 for r in select * from w2_test.functions loop execute r.ddl; end loop;
 for r in select * from w2_test.policies loop execute format('alter policy %I on public.%I using (%s)',r.policyname,r.tablename,r.qual); end loop;
end $$;
drop function public.is_staff();
alter table public.users drop constraint users_email_not_student_domain;
commit;
