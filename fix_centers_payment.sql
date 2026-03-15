"-- Modify centers table to add payment_status column and update status enum" 
"ALTER TABLE public.centers ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid'));" 
