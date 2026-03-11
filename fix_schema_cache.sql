-- Fix schema cache issue for class_level column
-- This script refreshes the schema cache and ensures the students table has all required columns

-- First, verify the students table has class_level
ALTER TABLE IF EXISTS public.students 
ADD COLUMN IF NOT EXISTS class_level integer DEFAULT 8;

-- Update any null values
UPDATE public.students SET class_level = 8 WHERE class_level IS NULL;

-- Make the column not null
ALTER TABLE public.students
ALTER COLUMN class_level SET NOT NULL;

-- Refresh the schema cache by updating a field that triggers cache refresh
-- This helps with PostgREST/InsForge schema discovery
NOTIFY pgrst, 'reload schema';
