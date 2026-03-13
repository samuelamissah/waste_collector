do $$
declare
  target_email text := 'admin@example.com';
  target_role text := 'admin';
  target_user_id uuid;
begin
  select id into target_user_id
  from auth.users
  where lower(email) = lower(target_email)
  limit 1;

  if target_user_id is null then
    raise exception 'No auth user found for email: %', target_email;
  end if;

  insert into public.profiles (id, role)
  values (target_user_id, target_role)
  on conflict (id) do update set role = excluded.role;
end;
$$;

