-- Enable RLS for pickup_requests
alter table if exists public.pickup_requests enable row level security;

-- Policy: Residents can insert their own requests
drop policy if exists "Residents can insert own requests" on public.pickup_requests;
create policy "Residents can insert own requests"
  on public.pickup_requests
  for insert
  with check (auth.uid() = user_id);

-- Policy: Residents can view their own requests
drop policy if exists "Residents can view own requests" on public.pickup_requests;
create policy "Residents can view own requests"
  on public.pickup_requests
  for select
  using (auth.uid() = user_id);

-- Policy: Collectors can view requests assigned to them
drop policy if exists "Collectors can view assigned requests" on public.pickup_requests;
create policy "Collectors can view assigned requests"
  on public.pickup_requests
  for select
  using (auth.uid() = assigned_collector_id);

-- Policy: Collectors can update requests assigned to them (e.g., status, verified_at, completed_at)
drop policy if exists "Collectors can update assigned requests" on public.pickup_requests;
create policy "Collectors can update assigned requests"
  on public.pickup_requests
  for update
  using (auth.uid() = assigned_collector_id);

-- Policy: Admins can do everything
drop policy if exists "Admins full access pickup_requests" on public.pickup_requests;
create policy "Admins full access pickup_requests"
  on public.pickup_requests
  for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Enable RLS for pickup_logs
alter table if exists public.pickup_logs enable row level security;

-- Policy: Collectors can insert logs for requests they are assigned to
drop policy if exists "Collectors can insert logs" on public.pickup_logs;
create policy "Collectors can insert logs"
  on public.pickup_logs
  for insert
  with check (auth.uid() = collector_id);

-- Policy: Collectors can view their own logs
drop policy if exists "Collectors can view own logs" on public.pickup_logs;
create policy "Collectors can view own logs"
  on public.pickup_logs
  for select
  using (auth.uid() = collector_id);

-- Policy: Admins full access pickup_logs
drop policy if exists "Admins full access pickup_logs" on public.pickup_logs;
create policy "Admins full access pickup_logs"
  on public.pickup_logs
  for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
