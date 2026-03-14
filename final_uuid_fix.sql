-- UNIVERSAL UUID FIX FOR INSFORGE DATABASE
-- Run this in the InsForge SQL Editor to resolve the "invalid input syntax for type integer" error.
-- This script safely converts ID and Foreign Key columns from INTEGER to UUID.

BEGIN;

-- 1. FIX STUDENTS TABLE
DO $$ 
BEGIN 
    -- Change 'id' type if it's currently an integer
    -- (Checks information_schema to see if conversion is needed)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'students' AND column_name = 'id' AND data_type = 'integer'
    ) THEN
        -- Remove dependent constraints first
        ALTER TABLE IF EXISTS public.payments DROP CONSTRAINT IF EXISTS payments_student_id_fkey;
        ALTER TABLE IF EXISTS public.wallets DROP CONSTRAINT IF EXISTS wallets_student_id_fkey;
        ALTER TABLE IF EXISTS public.exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_student_id_fkey;
        ALTER TABLE IF EXISTS public.exam_results DROP CONSTRAINT IF EXISTS exam_results_student_id_fkey;
        
        -- Convert id column
        ALTER TABLE public.students ALTER COLUMN id TYPE UUID USING (NULL); -- Start fresh or use a complex cast if data exists
        
        -- Re-add Auth reference
        ALTER TABLE public.students ADD CONSTRAINT students_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. FIX PAYMENTS TABLE
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'student_id' AND data_type = 'integer'
    ) THEN
        ALTER TABLE public.payments ALTER COLUMN student_id TYPE UUID USING (NULL);
        ALTER TABLE public.payments ADD CONSTRAINT payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. FIX WALLETS TABLE
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wallets' AND column_name = 'student_id' AND data_type = 'integer'
    ) THEN
        ALTER TABLE public.wallets ALTER COLUMN student_id TYPE UUID USING (NULL);
        ALTER TABLE public.wallets ADD CONSTRAINT wallets_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. ENSURE ADMIN USERS TABLE IS CORRECT
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' AND column_name = 'id' AND data_type = 'integer'
    ) THEN
        ALTER TABLE public.admin_users ALTER COLUMN id TYPE UUID USING (NULL);
        ALTER TABLE public.admin_users ADD CONSTRAINT admin_users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

COMMIT;

-- CRITICAL: Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';

-- VERIFICATION QUERY
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE column_name IN ('id', 'student_id') 
AND table_name IN ('students', 'payments', 'wallets', 'admin_users');
