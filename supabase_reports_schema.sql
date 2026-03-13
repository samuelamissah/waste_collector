do $$
begin
  if to_regclass('public.reports') is null then
    raise exception 'Table public.reports does not exist';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reports'
      and column_name = 'message'
  ) then
    execute 'alter table public.reports add column message text';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reports'
      and column_name = 'type'
  ) then
    execute 'alter table public.reports add column type text';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reports'
      and column_name = 'description'
  ) then
    execute 'alter table public.reports add column description text';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reports'
      and column_name = 'image_url'
  ) then
    execute 'alter table public.reports add column image_url text';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reports'
      and column_name = 'latitude'
  ) then
    execute 'alter table public.reports add column latitude double precision';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reports'
      and column_name = 'longitude'
  ) then
    execute 'alter table public.reports add column longitude double precision';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reports'
      and column_name = 'status'
  ) then
    execute 'alter table public.reports add column status text not null default ''open''';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reports'
      and column_name = 'updated_at'
  ) then
    execute 'alter table public.reports add column updated_at timestamptz not null default now()';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'reports'
      and indexname = 'reports_status_idx'
  ) then
    execute 'create index reports_status_idx on public.reports (status)';
  end if;
end;
$$;
