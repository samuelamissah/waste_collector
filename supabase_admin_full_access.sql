create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.is_collector()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'collector'
  );
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_collector() to authenticated;

do $$
begin
  if to_regclass('public.bins') is not null then
    execute 'alter table public.bins enable row level security';

    execute 'drop policy if exists "bins_select_authenticated" on public.bins';
    execute 'create policy "bins_select_authenticated" on public.bins for select using (auth.role() = ''authenticated'')';

    execute 'drop policy if exists "bins_insert_admin" on public.bins';
    execute 'create policy "bins_insert_admin" on public.bins for insert with check (public.is_admin())';

    execute 'drop policy if exists "bins_update_admin" on public.bins';
    execute 'create policy "bins_update_admin" on public.bins for update using (public.is_admin()) with check (public.is_admin())';

    execute 'drop policy if exists "bins_delete_admin" on public.bins';
    execute 'create policy "bins_delete_admin" on public.bins for delete using (public.is_admin())';
  end if;

  if to_regclass('public.profiles') is not null then
    execute 'alter table public.profiles enable row level security';

    execute 'drop policy if exists "profiles_select_own" on public.profiles';
    execute 'create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id)';

    execute 'drop policy if exists "profiles_select_admin" on public.profiles';
    execute 'create policy "profiles_select_admin" on public.profiles for select using (public.is_admin())';

    execute 'drop policy if exists "profiles_insert_own" on public.profiles';
    execute 'create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id)';

    execute 'drop policy if exists "profiles_update_own" on public.profiles';
    execute 'create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id)';

    execute 'drop policy if exists "profiles_update_admin" on public.profiles';
    execute 'create policy "profiles_update_admin" on public.profiles for update using (public.is_admin()) with check (public.is_admin())';
  end if;

  if to_regclass('public.pickup_requests') is not null then
    execute 'alter table public.pickup_requests enable row level security';

    execute 'drop policy if exists "pickup_requests_select_own" on public.pickup_requests';
    execute 'create policy "pickup_requests_select_own" on public.pickup_requests for select using (auth.uid() = user_id)';

    execute 'drop policy if exists "pickup_requests_insert_own" on public.pickup_requests';
    execute 'create policy "pickup_requests_insert_own" on public.pickup_requests for insert with check (auth.uid() = user_id)';

    execute 'drop policy if exists "pickup_requests_select_collector_assigned" on public.pickup_requests';
    execute 'create policy "pickup_requests_select_collector_assigned" on public.pickup_requests for select using (public.is_collector() and assigned_collector_id = auth.uid())';

    execute 'drop policy if exists "pickup_requests_update_collector_assigned" on public.pickup_requests';
    execute 'create policy "pickup_requests_update_collector_assigned" on public.pickup_requests for update using (public.is_collector() and assigned_collector_id = auth.uid()) with check (public.is_collector() and assigned_collector_id = auth.uid())';

    execute 'drop policy if exists "pickup_requests_select_admin" on public.pickup_requests';
    execute 'create policy "pickup_requests_select_admin" on public.pickup_requests for select using (public.is_admin())';

    execute 'drop policy if exists "pickup_requests_insert_admin" on public.pickup_requests';
    execute 'create policy "pickup_requests_insert_admin" on public.pickup_requests for insert with check (public.is_admin())';

    execute 'drop policy if exists "pickup_requests_update_admin" on public.pickup_requests';
    execute 'create policy "pickup_requests_update_admin" on public.pickup_requests for update using (public.is_admin()) with check (public.is_admin())';

    execute 'drop policy if exists "pickup_requests_delete_admin" on public.pickup_requests';
    execute 'create policy "pickup_requests_delete_admin" on public.pickup_requests for delete using (public.is_admin())';
  end if;

  if to_regclass('public.pickup_logs') is not null then
    execute 'alter table public.pickup_logs enable row level security';

    execute 'drop policy if exists "pickup_logs_select_admin" on public.pickup_logs';
    execute 'create policy "pickup_logs_select_admin" on public.pickup_logs for select using (public.is_admin())';

    execute 'drop policy if exists "pickup_logs_insert_admin" on public.pickup_logs';
    execute 'create policy "pickup_logs_insert_admin" on public.pickup_logs for insert with check (public.is_admin())';

    execute 'drop policy if exists "pickup_logs_select_collector" on public.pickup_logs';
    execute 'create policy "pickup_logs_select_collector" on public.pickup_logs for select using (public.is_collector() and collector_id = auth.uid())';

    execute 'drop policy if exists "pickup_logs_insert_collector" on public.pickup_logs';
    execute 'create policy "pickup_logs_insert_collector" on public.pickup_logs for insert with check (public.is_collector() and collector_id = auth.uid())';
  end if;

  if to_regclass('public.reports') is not null then
    execute 'alter table public.reports enable row level security';

    execute 'drop policy if exists "reports_select_own" on public.reports';
    execute 'create policy "reports_select_own" on public.reports for select using (auth.uid() = user_id)';

    execute 'drop policy if exists "reports_insert_own" on public.reports';
    execute 'create policy "reports_insert_own" on public.reports for insert with check (auth.uid() = user_id)';

    execute 'drop policy if exists "reports_select_admin" on public.reports';
    execute 'create policy "reports_select_admin" on public.reports for select using (public.is_admin())';

    execute 'drop policy if exists "reports_update_admin" on public.reports';
    execute 'create policy "reports_update_admin" on public.reports for update using (public.is_admin()) with check (public.is_admin())';

    execute 'drop policy if exists "reports_delete_admin" on public.reports';
    execute 'create policy "reports_delete_admin" on public.reports for delete using (public.is_admin())';
  end if;
end;
$$;


