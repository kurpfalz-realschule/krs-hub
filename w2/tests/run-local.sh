#!/bin/sh
set -eu
# Fixed loopback socket and disposable DB: no production URL parameter.
cd "$(dirname "$0")/../.."
PSQL=/opt/homebrew/opt/postgresql@18/bin/psql
CREATEDB=/opt/homebrew/opt/postgresql@18/bin/createdb
DB="w2_synthetic_$(date +%s)_$$"
"$CREATEDB" -h /tmp/krs-w2-pg-socket -p 55483 "$DB"
run() { "$PSQL" -h /tmp/krs-w2-pg-socket -p 55483 -d "$DB" -X -v ON_ERROR_STOP=1 -f "$1"; }
run w2/tests/bootstrap.sql
run w2/drafts/W2-00-school-features.sql
run w2/drafts/W2-01a-staff-gate.sql
run w2/tests/flags-staff.sql
run w2/drafts/W2-00-disable.sql
run w2/drafts/W2-01a-UNDO-local.sql
"$PSQL" -h /tmp/krs-w2-pg-socket -p 55483 -d "$DB" -X -v ON_ERROR_STOP=1 <<'SQL'
do $$ begin
 if exists(select 1 from w2_test.functions f where not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and pg_get_functiondef(p.oid)=f.ddl)) then raise exception 'function undo mismatch'; end if;
 if exists(select 1 from w2_test.policies old left join pg_policies now on now.tablename=old.tablename and now.policyname=old.policyname and now.schemaname='public' where old.qual is distinct from now.qual) then raise exception 'policy undo mismatch'; end if;
 if exists(select 1 from public.school_features where enabled) then raise exception 'disable failed'; end if;
end $$;
select 'PASS: operational flag disable / exact local function-policy undo' result;
SQL
