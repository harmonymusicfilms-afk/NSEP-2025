-- =========================================================
-- Complete Students Table for InsForge - Matches TypeScript
-- Run this in InsForge SQL Editor
-- =========================================================

-- Step 1: Drop existing table if needed (WARNING: deletes all data)
-- DROP TABLE IF EXISTS public.students CASCADE;

-- Step 2: Create students table with columns matching frontend/backend
CREATE TABLE IF NOT EXISTS public.students (
    -- Primary key (links to auth.users)
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    
    -- Personal Info
    name text NOT NULL,
    father_name text NOT NULL,
    class integer NOT NULL CHECK (class BETWEEN 1 AND 12),
    mobile text NOT NULL UNIQUE,
    email text NOT NULL UNIQUE,
    
    -- School Info
    school_name text NOT NULL,
    school_contact text NOT NULL,
    
    -- Address
    address_village text NOT NULL,
    address_block text NOT NULL,
    address_tahsil text NOT NULL,
    address_district text NOT NULL,
    address_state text NOT NULL,
    
    -- Photo
    photo_url text,
    
    -- Center & Referral
    center_code text NOT NULL UNIQUE,
    referral_code text UNIQUE,
    referred_by_center text,
    referred_by_student text,
    
    -- Status & Verification
    status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('ACTIVE', 'BLOCKED', 'PENDING')),
    mobile_verified boolean DEFAULT false,
    email_verified boolean DEFAULT false,
    
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Step 3: Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(class);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);
CREATE INDEX IF NOT EXISTS idx_students_center_code ON public.students(center_code);
CREATE INDEX IF NOT EXISTS idx_students_referral_code ON public.students(referral_code);
CREATE INDEX IF NOT EXISTS idx_students_referred_by_center ON public.students(referred_by_center);
CREATE INDEX IF NOT EXISTS idx_students_referred_by_student ON public.students(referred_by_student);
CREATE INDEX IF NOT EXISTS idx_students_mobile ON public.students(mobile);
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON public.students(created_at DESC);

-- Step 4: Enable Row Level Security
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Step 5: RLS Policies

-- Policy 1: Students can read their own profile
CREATE POLICY "Students can view own profile" ON public.students
    FOR SELECT USING (auth.uid() = id);

-- Policy 2: Students can update their own profile
CREATE POLICY "Students can update own profile" ON public.students
    FOR UPDATE USING (auth.uid() = id);

-- Policy 3: Admins can do everything (matches existing backend_schema.sql)
CREATE POLICY "Admins can view all students" ON public.students
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins can insert students" ON public.students
    FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins can update students" ON public.students
    FOR UPDATE USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins can delete students" ON public.students
    FOR DELETE USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

-- Step 6: Create trigger for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_students_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS students_updated_at_trigger ON public.students;
CREATE TRIGGER students_updated_at_trigger
    BEFORE UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION update_students_timestamp();

-- Step 7: Add comments for documentation
COMMENT ON TABLE public.students IS 'Student profiles - NSEP exam registration';
COMMENT ON COLUMN public.students.class IS 'Class/Grade (1-12)';
COMMENT ON COLUMN public.students.referred_by_center IS 'Center code that referred this student';
COMMENT ON COLUMN public.students.referred_by_student IS 'Student ID who referred this student';

-- Step 8: Verify the table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'students'
ORDER BY ordinal_position;

-- Step 9: Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';

-- Success!
SELECT 'Students table created successfully!' AS result;
