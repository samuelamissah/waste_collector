do $$
begin
  -- Drop the existing check constraint if it exists
  if exists (
    select 1
    from pg_constraint
    where conname = 'pickup_requests_status_check'
  ) then
    execute 'alter table public.pickup_requests drop constraint pickup_requests_status_check';
  end if;

  -- Add the updated check constraint including 'verified'
  execute 'alter table public.pickup_requests add constraint pickup_requests_status_check check (status in (''pending'', ''assigned'', ''verified'', ''completed'', ''cancelled''))';
end;
$$;
