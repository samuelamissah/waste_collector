-- Add tracking columns to pickup_requests
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pickup_requests'
      and column_name = 'start_location_lat'
  ) then
    execute 'alter table public.pickup_requests add column start_location_lat numeric';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pickup_requests'
      and column_name = 'start_location_lng'
  ) then
    execute 'alter table public.pickup_requests add column start_location_lng numeric';
  end if;
end;
$$;
