-- FIX FOR: "invalid input syntax for type integer: 'UUID-STRING'"
-- This error occurs because the students.id column is defined as INTEGER 
-- but we are trying to insert a UUID from Auth.

BEGIN;

-- 1. Check current type for reference
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'students' AND column_name = 'id';

-- 2. Alter the column type to UUID
-- We use USING id::uuid to safely convert (if there are no incompatible existing values)
ALTER TABLE public.students 
ALTER COLUMN id TYPE UUID USING id::uuid;

-- 3. Re-ensure the primary key and foreign key reference to auth.users
-- This is critical for Supabase/InsForge security
ALTER TABLE public.students
DROP CONSTRAINT IF EXISTS students_id_fkey;

ALTER TABLE public.students
ADD CONSTRAINT students_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Check results
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'students' AND column_name = 'id';

COMMIT;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
