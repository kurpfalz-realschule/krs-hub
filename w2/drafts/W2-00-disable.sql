-- Operational rollback: keep flags/data; owner-only until audited RPC exists.
begin;
update public.school_features set enabled=false, updated_at=now(), updated_by=null;
commit;
