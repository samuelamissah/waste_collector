do $$
begin
  if to_regclass('public.bins') is null then
    raise exception 'Table public.bins does not exist';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bins'
      and column_name = 'code'
  ) then
    execute 'alter table public.bins add column code text';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'bins'
      and indexname = 'bins_code_unique'
  ) then
    execute 'create unique index bins_code_unique on public.bins (code)';
  end if;
end;
$$;
