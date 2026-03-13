do $$
begin
  if to_regclass('public.pickup_requests') is null then
    raise exception 'Table public.pickup_requests does not exist';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pickup_requests'
      and column_name = 'latitude'
  ) then
    execute 'alter table public.pickup_requests add column latitude double precision';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pickup_requests'
      and column_name = 'longitude'
  ) then
    execute 'alter table public.pickup_requests add column longitude double precision';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'pickup_requests'
      and indexname = 'pickup_requests_lat_lng_idx'
  ) then
    execute 'create index pickup_requests_lat_lng_idx on public.pickup_requests (latitude, longitude)';
  end if;
end;
$$;

