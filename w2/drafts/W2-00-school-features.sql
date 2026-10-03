-- Local isolated candidate, NOT a deployment migration. CLI is not installed.
-- Convert with `supabase migration new` only after Staging/Gate A readiness.
-- Requires the synthetic local harness marker; intentionally fails elsewhere.
begin;
do $$ begin
  if to_regclass('w2_test.environment') is null then raise exception 'isolated W2 test environment required'; end if;
  if to_regclass('public.school_features') is not null then raise exception 'W2 baseline already exists'; end if;
end $$;
create table public.school_features (
  key text primary key check (key in ('UNTERRICHT','HAUSAUFGABEN','BBB')),
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by bigint references public.users(id)
);
insert into public.school_features(key) values ('UNTERRICHT'),('HAUSAUFGABEN'),('BBB');
alter table public.school_features enable row level security;
revoke all on public.school_features from public, anon, authenticated;
grant select on public.school_features to authenticated;
create policy sf_read on public.school_features for select to authenticated using (true);
create schema w2_private;
revoke all on schema w2_private from public, anon;
grant usage on schema w2_private to authenticated;
-- Invoker is sufficient: caller can read the non-sensitive flags through RLS.
create function w2_private.feature_on(p_key text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select coalesce((select enabled from public.school_features where key = p_key), false)
$$;
revoke all on function w2_private.feature_on(text) from public, anon;
grant execute on function w2_private.feature_on(text) to authenticated;
commit;
