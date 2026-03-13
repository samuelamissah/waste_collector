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

grant execute on function public.is_admin() to authenticated;

alter table if exists public.bins enable row level security;

drop policy if exists "bins_select_authenticated" on public.bins;
create policy "bins_select_authenticated" on public.bins
for select
using (auth.role() = 'authenticated');

drop policy if exists "bins_insert_admin" on public.bins;
create policy "bins_insert_admin" on public.bins
for insert
with check (public.is_admin());

drop policy if exists "bins_update_admin" on public.bins;
create policy "bins_update_admin" on public.bins
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "bins_delete_admin" on public.bins;
create policy "bins_delete_admin" on public.bins
for delete
using (public.is_admin());

