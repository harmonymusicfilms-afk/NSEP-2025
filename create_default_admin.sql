-- =============================================================================
-- Admin Authentication System Fix
-- Run this in Backend SQL Editor
-- =============================================================================

-- 1. Add password_hash column to admin_users if it doesn't exist
ALTER TABLE public.admin_users 
ADD COLUMN IF NOT EXISTS password_hash text;

-- 2. Check if admin user exists in auth.users, if not we'll need to create it
-- Note: Creating users in auth.users requires service role or admin API
-- For now, we'll handle this in the application code

-- 3. Create a function to create admin if not exists (using service role would be needed)
-- This function will be called by the frontend on first login

CREATE OR REPLACE FUNCTION public.ensure_admin_user()
RETURNS void AS $$
DECLARE
    admin_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE email = 'admin@gphdm.com'
    ) INTO admin_exists;
    
    IF NOT admin_exists THEN
        -- Create admin_users entry (auth.users entry handled by app)
        INSERT INTO public.admin_users (
            id,
            name,
            email,
            role,
            password_hash,
            created_at,
            last_login,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'Super Admin',
            'admin@gphdm.com',
            'SUPER_ADMIN',
            'admin123',
            now(),
            null,
            now()
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant permissions
GRANT SELECT ON public.admin_users TO anon;
GRANT SELECT ON public.admin_users TO authenticated;

-- 5. Display current admin users
SELECT 
    id, 
    name, 
    email, 
    role, 
    created_at, 
    last_login,
    CASE WHEN password_hash IS NOT NULL THEN 'Yes' ELSE 'No' END as has_password
FROM public.admin_users 
ORDER BY created_at DESC
LIMIT 10;
