-- Fix for missing address_district column in students table
-- Run this in InsForge SQL Editor

DO $$ 
BEGIN 
    -- 1. Check and add address_village
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='students' AND column_name='address_village') THEN
        ALTER TABLE public.students ADD COLUMN address_village text;
    END IF;

    -- 2. Check and add address_block
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='students' AND column_name='address_block') THEN
        ALTER TABLE public.students ADD COLUMN address_block text;
    END IF;

    -- 3. Check and add address_tahsil
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='students' AND column_name='address_tahsil') THEN
        ALTER TABLE public.students ADD COLUMN address_tahsil text;
    END IF;

    -- 4. Check and add address_district
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='students' AND column_name='address_district') THEN
        ALTER TABLE public.students ADD COLUMN address_district text;
    END IF;

    -- 5. Check and add address_state
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='students' AND column_name='address_state') THEN
        ALTER TABLE public.students ADD COLUMN address_state text;
    END IF;
END $$;

-- Refresh PostgREST cache (CRITICAL for InsForge/Supabase)
NOTIFY pgrst, 'reload schema';

-- Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'students' 
AND column_name LIKE 'address_%';
