-- Sync profiles with auth.users metadata
-- This fixes users who signed up but failed to create a profile due to RLS

DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all users in auth.users
  FOR user_record IN 
    SELECT id, email, raw_user_meta_data 
    FROM auth.users
  LOOP
    -- If the user has metadata saying they are a collector
    IF user_record.raw_user_meta_data->>'role' = 'collector' THEN
      -- Upsert into profiles
      INSERT INTO public.profiles (id, email, full_name, role)
      VALUES (
        user_record.id,
        user_record.email,
        COALESCE(user_record.raw_user_meta_data->>'full_name', 'Collector'),
        'collector'
      )
      ON CONFLICT (id) DO UPDATE
      SET role = 'collector';
      
    -- If the user has metadata saying they are a user (resident)
    ELSIF user_record.raw_user_meta_data->>'role' = 'user' THEN
      INSERT INTO public.profiles (id, email, full_name, role)
      VALUES (
        user_record.id,
        user_record.email,
        COALESCE(user_record.raw_user_meta_data->>'full_name', 'User'),
        'user'
      )
      ON CONFLICT (id) DO NOTHING; -- Don't overwrite if they are already there
    END IF;
  END LOOP;
END;
$$;
