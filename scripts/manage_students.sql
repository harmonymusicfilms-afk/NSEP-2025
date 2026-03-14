-- =========================================================
-- Student Data Management SQL
-- Run this in InsForge SQL Editor
-- =========================================================

-- ============================================================================
-- UPDATE: Fix class column - ensure all students have valid class (1-12)
-- ============================================================================

-- Check current class values distribution
SELECT class, COUNT(*) as student_count 
FROM public.students 
GROUP BY class 
ORDER BY class;

-- Update NULL class values to default (e.g., 8)
-- UPDATE public.students SET class = 8 WHERE class IS NULL;

-- ============================================================================
-- UPDATE: Fix referred_by_center column
-- ============================================================================

-- Check current referred_by_center values
SELECT referred_by_center, COUNT(*) as count 
FROM public.students 
GROUP BY referred_by_center 
ORDER BY count DESC;

-- Clean up empty strings to NULL
-- UPDATE public.students SET referred_by_center = NULL WHERE referred_by_center = '';

-- ============================================================================
-- UPDATE: Fix status values
-- ============================================================================

-- Check current status distribution
SELECT status, COUNT(*) as count 
FROM public.students 
GROUP BY status;

-- Activate all pending students (example)
-- UPDATE public.students SET status = 'ACTIVE' WHERE status = 'PENDING';

-- ============================================================================
-- DELETE: Remove duplicate students by mobile/email
-- ============================================================================

-- Find duplicates
-- SELECT mobile, COUNT(*) as dup_count 
-- FROM public.students 
-- GROUP BY mobile 
-- HAVING COUNT(*) > 1;

-- Remove duplicates keeping the newest
-- DELETE FROM public.students 
-- WHERE id NOT IN (
--   SELECT MAX(id) FROM public.students GROUP BY mobile
-- );

-- ============================================================================
-- INDEXES: Create indexes for better performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(class);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);
CREATE INDEX IF NOT EXISTS idx_students_center_code ON public.students(center_code);
CREATE INDEX IF NOT EXISTS idx_students_referred_by_center ON public.students(referred_by_center);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON public.students(created_at DESC);

-- ============================================================================
-- REFRESH: PostgREST schema cache after any changes
-- ============================================================================
NOTIFY pgrst, 'reload schema';
