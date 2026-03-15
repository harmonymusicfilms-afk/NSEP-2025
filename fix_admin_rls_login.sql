-- =============================================================================
-- Fix RLS Policy for Admin Login
-- Run this in Backend SQL Editor
-- 
-- Problem: When admin logs in for the first time, they can't insert into 
-- admin_users because is_admin() returns false (circular dependency!)
-- =============================================================================

-- 1. Allow authenticated users to insert into admin_users (for self-registration)
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.admin_users;

CREATE POLICY "Admins can insert own row" 
ON public.admin_users 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 2. Also ensure the service role or anon can insert (for setup)
-- This is a workaround - in production, you might want a function with 
-- SECURITY DEFINER to handle this

-- 3. Verify the centers table policies are correct
-- They should use is_admin() which will now work after admin is created
