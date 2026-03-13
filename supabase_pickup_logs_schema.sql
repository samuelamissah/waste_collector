create extension if not exists "pgcrypto";

do $$
begin
  if to_regclass('public.pickup_logs') is null then
    execute 'create table public.pickup_logs (
      id uuid primary key default gen_random_uuid(),
      request_id uuid not null,
      collector_id uuid not null,
      action text not null default ''completed'',
      weight_kg numeric,
      notes text,
      created_at timestamptz not null default now()
    )';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pickup_logs'
      and column_name = 'request_id'
  ) then
    execute 'alter table public.pickup_logs add column request_id uuid';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pickup_logs'
      and column_name = 'collector_id'
  ) then
    execute 'alter table public.pickup_logs add column collector_id uuid';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pickup_logs'
      and column_name = 'action'
  ) then
    execute 'alter table public.pickup_logs add column action text not null default ''completed''';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pickup_logs'
      and column_name = 'weight_kg'
  ) then
    execute 'alter table public.pickup_logs add column weight_kg numeric';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pickup_logs'
      and column_name = 'notes'
  ) then
    execute 'alter table public.pickup_logs add column notes text';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pickup_logs'
      and column_name = 'created_at'
  ) then
    execute 'alter table public.pickup_logs add column created_at timestamptz not null default now()';
  end if;

  if to_regclass('public.pickup_requests') is not null then
    begin
      execute 'alter table public.pickup_logs add constraint pickup_logs_request_id_fkey foreign key (request_id) references public.pickup_requests(id) on delete cascade';
    exception
      when duplicate_object then null;
    end;
  end if;

  if to_regclass('public.profiles') is not null then
    begin
      execute 'alter table public.pickup_logs add constraint pickup_logs_collector_id_fkey foreign key (collector_id) references public.profiles(id) on delete cascade';
    exception
      when duplicate_object then null;
    end;
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'pickup_logs'
      and indexname = 'pickup_logs_request_id_idx'
  ) then
    execute 'create index pickup_logs_request_id_idx on public.pickup_logs (request_id)';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'pickup_logs'
      and indexname = 'pickup_logs_collector_id_idx'
  ) then
    execute 'create index pickup_logs_collector_id_idx on public.pickup_logs (collector_id)';
  end if;
end;
$$;
