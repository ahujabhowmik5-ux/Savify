-- SQL to create a test user for PhonePe verification
-- Run this in your Supabase SQL Editor

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'bhowmik@test.com',
  crypt('Test@123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now()
) ON CONFLICT DO NOTHING;

-- Note: In some Supabase versions, there might be a unique constraint on (email). 
-- If 'ON CONFLICT DO NOTHING' throws a syntax error because the target constraint isn't specified,
-- just run the INSERT statement without the ON CONFLICT clause. If the user already exists, it will safely error out.
