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
      and column_name = 'user_id'
  ) then
    execute 'alter table public.pickup_requests add column user_id uuid';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pickup_requests'
      and column_name = 'bin_id'
  ) then
    execute 'alter table public.pickup_requests add column bin_id uuid';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pickup_requests'
      and column_name = 'waste_type'
  ) then
    execute 'alter table public.pickup_requests add column waste_type text';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pickup_requests'
      and column_name = 'notes'
  ) then
    execute 'alter table public.pickup_requests add column notes text';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pickup_requests'
      and column_name = 'address'
  ) then
    execute 'alter table public.pickup_requests add column address text';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pickup_requests'
      and column_name = 'status'
  ) then
    execute 'alter table public.pickup_requests add column status text';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pickup_requests'
      and column_name = 'assigned_collector_id'
  ) then
    execute 'alter table public.pickup_requests add column assigned_collector_id uuid';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pickup_requests'
      and column_name = 'created_at'
  ) then
    execute 'alter table public.pickup_requests add column created_at timestamptz not null default now()';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pickup_requests'
      and column_name = 'verified_at'
  ) then
    execute 'alter table public.pickup_requests add column verified_at timestamptz';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pickup_requests'
      and column_name = 'completed_at'
  ) then
    execute 'alter table public.pickup_requests add column completed_at timestamptz';
  end if;

  if to_regclass('public.profiles') is not null then
    begin
      execute 'alter table public.pickup_requests add constraint pickup_requests_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade';
    exception
      when duplicate_object then null;
    end;

    begin
      execute 'alter table public.pickup_requests add constraint pickup_requests_assigned_collector_id_fkey foreign key (assigned_collector_id) references public.profiles(id) on delete set null';
    exception
      when duplicate_object then null;
    end;
  end if;

  if to_regclass('public.bins') is not null then
    begin
      execute 'alter table public.pickup_requests add constraint pickup_requests_bin_id_fkey foreign key (bin_id) references public.bins(id) on delete set null';
    exception
      when duplicate_object then null;
    end;
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'pickup_requests'
      and indexname = 'pickup_requests_user_id_idx'
  ) then
    execute 'create index pickup_requests_user_id_idx on public.pickup_requests (user_id)';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'pickup_requests'
      and indexname = 'pickup_requests_assigned_collector_id_idx'
  ) then
    execute 'create index pickup_requests_assigned_collector_id_idx on public.pickup_requests (assigned_collector_id)';
  end if;
end;
$$;
