-- ============================================
-- COMPLETE CENTER REGISTRATION SYSTEM FIX
-- Run this in your Backend SQL Editor
-- ============================================

-- ============================================
-- 1. ADD ALL MISSING COLUMNS TO CENTERS TABLE
-- ============================================

-- Core registration fields
ALTER TABLE public.centers 
ADD COLUMN IF NOT EXISTS center_type text,
ADD COLUMN IF NOT EXISTS owner_aadhaar text,
ADD COLUMN IF NOT EXISTS village text,
ADD COLUMN IF NOT EXISTS block text,
ADD COLUMN IF NOT EXISTS pincode text,
ADD COLUMN IF NOT EXISTS id_proof_url text,
ADD COLUMN IF NOT EXISTS address_proof_url text,
ADD COLUMN IF NOT EXISTS center_photo_url text,
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS transaction_id text,
ADD COLUMN IF NOT EXISTS payment_screenshot_url text;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_centers_user_id ON public.centers(user_id);
CREATE INDEX IF NOT EXISTS idx_centers_status ON public.centers(status);
CREATE INDEX IF NOT EXISTS idx_centers_email ON public.centers(email);

-- ============================================
-- 2. CREATE CENTER_TYPES LOOKUP TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.center_types (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Seed center types
INSERT INTO public.center_types (name, description) VALUES 
('School', 'Registered educational institution'),
('Coaching Center', 'Private coaching/instructional center'),
('Tuition Center', 'Private tutoring center'),
('NGO', 'Non-governmental organization'),
('Community Center', 'Community learning center'),
('Education Institute', 'Formal education institute'),
('Other', 'Other type of organization')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 3. CREATE CENTER_MEMBERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.center_members (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    center_id uuid REFERENCES public.centers(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    role text NOT NULL DEFAULT 'STAFF',
    phone text,
    email text,
    aadhaar_number text,
    photo_url text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ============================================
-- 4. ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.center_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.center_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CREATE RLS POLICIES FOR CENTERS
-- ============================================

-- Public can view approved centers
DROP POLICY IF EXISTS "Public can view approved centers" ON public.centers;
CREATE POLICY "Public can view approved centers" ON public.centers
    FOR SELECT USING (status = 'APPROVED' OR public.is_admin());

-- Public can register (insert) new center
DROP POLICY IF EXISTS "Public can register center" ON public.centers;
CREATE POLICY "Public can register center" ON public.centers
    FOR INSERT WITH CHECK (true);

-- Admins can manage all centers
DROP POLICY IF EXISTS "Admins can manage all centers" ON public.centers;
CREATE POLICY "Admins can manage all centers" ON public.centers
    FOR ALL USING (public.is_admin());

-- ============================================
-- 6. RLS POLICIES FOR CENTER_TYPES
-- ============================================

DROP POLICY IF EXISTS "Public can view center types" ON public.center_types;
CREATE POLICY "Public can view center types" ON public.center_types
    FOR SELECT USING (true);

-- ============================================
-- 7. RLS POLICIES FOR CENTER_MEMBERS
-- ============================================

DROP POLICY IF EXISTS "Admins can manage center members" ON public.center_members;
CREATE POLICY "Admins can manage center members" ON public.center_members
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Centers can view own members" ON public.center_members;
CREATE POLICY "Centers can view own members" ON public.center_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.centers 
            WHERE centers.id = center_members.center_id 
            AND centers.user_id = auth.uid()
        )
    );

-- ============================================
-- 8. CREATE UPDATED_AT TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to center_members
DROP TRIGGER IF EXISTS update_center_members_updated_at ON public.center_members;
CREATE TRIGGER update_center_members_updated_at
    BEFORE UPDATE ON public.center_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. VERIFY AND DISPLAY RESULTS
-- ============================================

-- Check columns in centers table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'centers' 
ORDER BY ordinal_position;

-- Check center_types
SELECT * FROM center_types;

-- Check policies
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('centers', 'center_types', 'center_members');

-- ============================================
-- 10. TEST INSERT (should work for public)
-- ============================================

-- This should succeed for testing:
-- INSERT INTO public.center_types (name) VALUES ('Test Center');

SELECT 'Center registration system setup complete!' as status;