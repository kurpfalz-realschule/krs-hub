-- Read-only inventory; no student identity or table creation. No personal data.
begin read only;
select schemaname,tablename,policyname,roles,cmd,qual,with_check
from pg_policies where (schemaname='public' and tablename in ('users','koffer_physisch','stundenraster')) or schemaname in ('storage','realtime')
order by schemaname,tablename,policyname;
select n.nspname schema,c.relname object,c.relkind,c.relrowsecurity,c.reloptions
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','storage') and c.relkind in ('r','p','v','m','f') order by 1,2;
select p.proname,pg_get_function_identity_arguments(p.oid) arguments,p.proconfig,
 has_function_privilege('authenticated',p.oid,'execute') authenticated,
 has_function_privilege('anon',p.oid,'execute') anon
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef order by 1,2;
select count(*) filter(where auth_id is null) unlinked_profiles from public.users;
select count(*) orphan_auth from auth.users a where not exists(select 1 from public.users u where u.auth_id=a.id);
rollback;
-- Manual evidence still required: signup off, isolated configuration + baseline,
-- S-2 authorization tests, storage/Edge/Realtime denials, encrypted backup/restore.
-- Only then W2-01b identity/exclusivity + complete leak suite, including concurrency.
