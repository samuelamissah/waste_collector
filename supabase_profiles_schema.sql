do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'Table public.profiles does not exist';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'full_name'
  ) then
    execute 'alter table public.profiles add column full_name text';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role'
  ) then
    execute 'alter table public.profiles add column role text';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'eco_points'
  ) then
    execute 'alter table public.profiles add column eco_points integer not null default 0';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'avatar_url'
  ) then
    execute 'alter table public.profiles add column avatar_url text';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'bin_id'
  ) then
    execute 'alter table public.profiles add column bin_id uuid';
  end if;

  if to_regclass('public.bins') is not null then
    begin
      execute 'alter table public.profiles add constraint profiles_bin_id_fkey foreign key (bin_id) references public.bins(id) on delete set null';
    exception
      when duplicate_object then null;
    end;
  end if;
end;
$$;

