-- =========================================================
-- Students Table Schema Verification & Management
-- Run this in InsForge SQL Editor
-- =========================================================

-- Step 1: Check current column names in students table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'students'
ORDER BY ordinal_position;

-- Step 2: Verify key columns exist (class and referred_by_center after migration)
SELECT 
  COUNT(*) as total_students,
  COUNT(DISTINCT class) as unique_classes,
  COUNT(DISTINCT referred_by_center) as unique_referring_centers,
  COUNT(DISTINCT referral_code) as unique_referral_codes
FROM public.students;

-- Step 3: Check for any NULL values in important columns
SELECT 
  'class NULLs' as check_name, COUNT(*) as null_count FROM public.students WHERE class IS NULL
UNION ALL
SELECT 'referred_by_center NULLs', COUNT(*) FROM public.students WHERE referred_by_center IS NULL
UNION ALL  
SELECT 'mobile NULLs', COUNT(*) FROM public.students WHERE mobile IS NULL
UNION ALL
SELECT 'email NULLs', COUNT(*) FROM public.students WHERE email IS NULL
UNION ALL
SELECT 'center_code NULLs', COUNT(*) FROM public.students WHERE center_code IS NULL;

-- Step 4: Sample student data (limit 10)
SELECT 
  id, 
  name, 
  father_name, 
  class, 
  mobile, 
  email,
  center_code,
  referral_code,
  referred_by_center,
  referred_by_student,
  status,
  created_at
FROM public.students
ORDER BY created_at DESC
LIMIT 10;
