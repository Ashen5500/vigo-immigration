-- ============================================================
-- VIGO IMMIGRATION: ADD EMAIL COLUMN & CONFIGURE SUPER ADMIN
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ybtlkjfzngupjesrfjqe/sql/new
-- ============================================================

-- 1. ADD 'email' COLUMN TO staff_profiles
ALTER TABLE public.staff_profiles 
  ADD COLUMN IF NOT EXISTS email text;

-- 2. POPULATE 'email' FOR ALL EXISTING ROWS FROM auth.users
UPDATE public.staff_profiles sp
SET email = au.email
FROM auth.users au
WHERE sp.id = au.id;

-- 3. ENSURE ashenperera550@gmail.com IS SUPER ADMIN & APPROVED
UPDATE public.staff_profiles
SET 
  role = 'super_admin',
  status = 'approved',
  email = COALESCE(email, 'ashenperera550@gmail.com')
WHERE 
  email ILIKE '%ashen%' 
  OR full_name ILIKE '%ashen%';

-- If an auth user exists for ashenperera550@gmail.com, ensure matching profile is super_admin + approved:
INSERT INTO public.staff_profiles (id, full_name, email, role, status)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', 'Ashen Perera'),
  email,
  'super_admin',
  'approved'
FROM auth.users
WHERE email ILIKE '%ashen%' OR email = 'ashenperera550@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  status = 'approved',
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name;

-- 4. UPDATE handle_new_user() TRIGGER TO AUTOMATICALLY STORE EMAIL
--    AND DEFAULT NEW PARTICIPANTS TO 'pending' (WAITING FOR SUPER ADMIN APPROVAL)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  staff_count int;
  user_email text;
  user_name text;
  is_admin boolean;
BEGIN
  user_email := COALESCE(new.email, '');
  user_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(user_email, '@', 1), 'Staff Member');
  
  -- Check if this is the very first profile or Ashen's email
  SELECT count(*) INTO staff_count FROM public.staff_profiles;
  is_admin := (staff_count = 0) OR (user_email ILIKE '%ashen%');

  INSERT INTO public.staff_profiles (id, full_name, email, role, status)
  VALUES (
    new.id,
    user_name,
    user_email,
    CASE WHEN is_admin THEN 'super_admin' ELSE 'consultant' END,
    CASE WHEN is_admin THEN 'approved' ELSE 'pending' END
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. ENSURE PERMISSIONS ARE GRANTED TO authenticated AND anon
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

