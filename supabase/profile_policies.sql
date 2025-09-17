-- Drop all existing policies on the profiles table to ensure a clean slate
DROP POLICY IF EXISTS "Admins have full access" ON public.profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
-- Dropping old names from previous attempts just in case
DROP POLICY IF EXISTS "Enable read access to own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable all access for admins" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;


-- 1. Admin Policy: Admins can perform any action on any profile.
-- This policy now uses the secure function to check the user's role.
CREATE POLICY "Admins have full access"
ON public.profiles
FOR ALL
TO authenticated
USING (get_my_role() = 'admin')
WITH CHECK (get_my_role() = 'admin');


-- 2. User Read Policy: Any authenticated user can read their own profile.
CREATE POLICY "Users can read their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());


-- 3. User Insert Policy: Any authenticated user can create their own profile.
CREATE POLICY "Users can create their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());


-- 4. User Update Policy: Any authenticated user can update their own profile.
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid());