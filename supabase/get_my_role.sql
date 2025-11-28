-- Drop the function if it already exists to ensure a clean setup
DROP FUNCTION IF EXISTS get_my_role();

-- Create the function that runs with the permissions of the creator (postgres)
-- This allows it to safely query the profiles table for the current user's role
-- without triggering the RLS policy on the same table, thus avoiding recursion.
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;