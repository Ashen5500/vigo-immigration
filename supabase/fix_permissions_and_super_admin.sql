-- =============================================================================
-- FIX SCRIPT: GRANT PERMISSIONS & ACTIVATE SUPER ADMIN
-- Run this in your Supabase SQL Editor and click "RUN"
-- =============================================================================

-- 1. Grant table access to authenticated and anon users (Fixes "42501 permission denied for table staff_profiles")
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated;

-- 2. Make sure RLS policies allow reading and updating staff_profiles
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_select" ON staff_profiles;
CREATE POLICY "staff_select" ON staff_profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "staff_anon_select" ON staff_profiles;
CREATE POLICY "staff_anon_select" ON staff_profiles FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "staff_insert" ON staff_profiles;
CREATE POLICY "staff_insert" ON staff_profiles FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "staff_update" ON staff_profiles;
CREATE POLICY "staff_update" ON staff_profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "staff_delete" ON staff_profiles;
CREATE POLICY "staff_delete" ON staff_profiles FOR DELETE TO authenticated USING (true);

-- 3. Sync all existing users from auth.users into staff_profiles (if any was missing)
INSERT INTO public.staff_profiles (id, full_name, role, status)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  'consultant',
  'pending'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 4. Promote the first registered user to SUPER ADMIN and mark APPROVED!
UPDATE public.staff_profiles
SET role = 'super_admin', status = 'approved'
WHERE id = (
  SELECT id FROM public.staff_profiles ORDER BY created_at ASC LIMIT 1
);

-- 5. Trigger: first user to sign up becomes super_admin + approved.
-- All subsequent users become consultant + pending (awaiting Super Admin approval).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_first boolean;
BEGIN
  SELECT count(*) = 0 INTO is_first FROM public.staff_profiles;

  INSERT INTO public.staff_profiles (id, full_name, role, status)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    CASE WHEN is_first THEN 'super_admin' ELSE 'consultant' END,
    CASE WHEN is_first THEN 'approved' ELSE 'pending' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

