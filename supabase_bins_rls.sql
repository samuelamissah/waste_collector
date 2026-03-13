alter table if exists public.bins enable row level security;

drop policy if exists "bins_select_authenticated" on public.bins;
create policy "bins_select_authenticated" on public.bins
for select
using (auth.role() = 'authenticated');

