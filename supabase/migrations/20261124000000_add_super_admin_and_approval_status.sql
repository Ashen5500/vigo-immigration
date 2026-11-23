-- =============================================================================
-- Migration: Add Super Admin Role and Participant Approval Status
-- =============================================================================

-- 1. Update role constraint to allow 'super_admin'
ALTER TABLE staff_profiles 
  DROP CONSTRAINT IF EXISTS staff_profiles_role_check;

ALTER TABLE staff_profiles 
  ADD CONSTRAINT staff_profiles_role_check 
  CHECK (role IN ('super_admin', 'admin', 'consultant'));

-- 2. Add status column with check constraint ('pending', 'approved', 'rejected')
ALTER TABLE staff_profiles 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending' 
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- 3. Update existing profiles: ensure existing users are marked 'approved',
-- and upgrade the existing admin to 'super_admin'
UPDATE staff_profiles SET role = 'super_admin', status = 'approved' WHERE role = 'admin';
UPDATE staff_profiles SET status = 'approved' WHERE status IS NULL OR status = 'pending';

-- 4. Enable RLS and set permissive policies for staff management
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_select" ON staff_profiles;
CREATE POLICY "staff_select" ON staff_profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "staff_insert" ON staff_profiles;
CREATE POLICY "staff_insert" ON staff_profiles FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "staff_update" ON staff_profiles;
CREATE POLICY "staff_update" ON staff_profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "staff_delete" ON staff_profiles;
CREATE POLICY "staff_delete" ON staff_profiles FOR DELETE TO authenticated USING (true);

-- 5. Trigger: first user to sign up becomes super_admin + approved.
-- Subsequent participants become consultant + pending (awaiting Super Admin approval).
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
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

