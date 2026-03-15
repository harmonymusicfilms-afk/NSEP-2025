-- Fix Admin Panel - Ensure admins can view all centers
-- Run this in your Backend SQL Editor

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Public can view approved centers" ON public.centers;
DROP POLICY IF EXISTS "Admins can manage all centers" ON public.centers;
DROP POLICY IF EXISTS "Public can register center" ON public.centers;
DROP POLICY IF EXISTS "Anyone can view approved centers" ON public.centers;
DROP POLICY IF EXISTS "Admins can manage centers" ON public.centers;
DROP POLICY IF EXISTS "Admins can manage centers V2" ON public.centers;

-- Create new policies
-- 1. Allow public to register (insert) centers
CREATE POLICY "Public can insert centers" ON public.centers
    FOR INSERT WITH CHECK (true);

-- 2. Allow public to view approved centers
CREATE POLICY "Public can view approved centers" ON public.centers
    FOR SELECT USING (status = 'APPROVED' OR status = 'PENDING' OR status = 'REJECTED');

-- 3. Allow authenticated users (including admins) to view all centers
CREATE POLICY "Authenticated can view all centers" ON public.centers
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 4. Allow admins to do everything
CREATE POLICY "Admins can do everything" ON public.centers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE admin_users.id = auth.uid()
        )
    );

-- Verify the policies are created
SELECT tablename, policyname, cmd FROM pg_policies 
WHERE tablename = 'centers';

-- Test: Try inserting a test center
-- INSERT INTO public.centers (center_name, center_type, owner_name, owner_mobile, owner_email, center_address, state, district, status)
-- VALUES ('Test Center', 'School', 'John Doe', '1234567890', 'test@test.com', 'Test Address', 'UP', 'Test', 'PENDING');

SELECT 'Admin RLS policies fixed!' as status;
