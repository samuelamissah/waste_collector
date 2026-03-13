create extension if not exists "pgcrypto";

do $$
begin
  if to_regclass('public.reports') is null then
    execute '
      create table public.reports (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null,
        type text,
        description text,
        message text,
        status text not null default ''open'',
        image_url text,
        latitude double precision,
        longitude double precision,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    ';
  end if;

  if to_regclass('public.profiles') is not null then
    begin
      execute 'alter table public.reports add constraint reports_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade';
    exception
      when duplicate_object then null;
    end;
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'reports'
      and indexname = 'reports_user_id_idx'
  ) then
    execute 'create index reports_user_id_idx on public.reports (user_id)';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'reports'
      and indexname = 'reports_created_at_idx'
  ) then
    execute 'create index reports_created_at_idx on public.reports (created_at desc)';
  end if;
end;
$$;

