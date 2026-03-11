-- Add missing columns for manual QR payment system
-- Run this to enhance the payments table

-- 1. Add admin_remark column for rejection reasons
ALTER TABLE IF EXISTS public.payments 
ADD COLUMN IF NOT EXISTS admin_remark TEXT;

COMMENT ON COLUMN public.payments.admin_remark IS 'Admin remark for payment approval/rejection';

-- 2. Add application_id column for tracking
ALTER TABLE IF EXISTS public.payments 
ADD COLUMN IF NOT EXISTS application_id TEXT;

COMMENT ON COLUMN public.payments.application_id IS 'Auto-generated application ID for student tracking';

-- 3. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_application_id ON public.payments(application_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- 4. Add payment_date column (auto-filled)
ALTER TABLE IF EXISTS public.payments 
ADD COLUMN IF NOT EXISTS payment_date DATE;

COMMENT ON COLUMN public.payments.payment_date IS 'Date of payment (auto-filled)';

-- 5. Ensure proof_url column exists (it might be missing)
ALTER TABLE IF EXISTS public.payments 
ADD COLUMN IF NOT EXISTS proof_url TEXT;

COMMENT ON COLUMN public.payments.proof_url IS 'URL to payment proof screenshot';

-- 6. Ensure transaction_id column exists
ALTER TABLE IF EXISTS public.payments 
ADD COLUMN IF NOT EXISTS transaction_id TEXT;

COMMENT ON COLUMN public.payments.transaction_id IS 'Transaction ID / UTR from payment';

-- Create function to auto-generate application_id
CREATE OR REPLACE FUNCTION generate_application_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.application_id IS NULL OR NEW.application_id = '' THEN
    NEW.application_id := 'NSEP-' || UPPER(TO_CHAR(NEW.created_at, 'YYYYMMDD')) || '-' || LEFT(NEW.id::TEXT, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate application_id
DROP TRIGGER IF EXISTS set_application_id ON public.payments;
CREATE TRIGGER set_application_id
  BEFORE INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION generate_application_id();

-- Enable RLS on payments table if not already
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for admin users to manage payments
DROP POLICY IF EXISTS "Admin full access to payments" ON public.payments;
CREATE POLICY "Admin full access to payments" ON public.payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid()
    )
  );

-- Create RLS policy for students to view their own payments
DROP POLICY IF EXISTS "Students can view own payments" ON public.payments;
CREATE POLICY "Students can view own payments" ON public.payments
  FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Create class_fees table for configurable fees
CREATE TABLE IF NOT EXISTS public.class_fees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  class_level INTEGER NOT NULL UNIQUE CHECK (class_level BETWEEN 1 AND 12),
  joining_amount DECIMAL(10, 2) NOT NULL DEFAULT 250,
  exam_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default class fees if table is empty
INSERT INTO public.class_fees (class_level, joining_amount, exam_fee) 
SELECT 
  generate_series AS class_level,
  CASE 
    WHEN generate_series <= 5 THEN 250
    WHEN generate_series <= 8 THEN 300
    ELSE 350
  END AS joining_amount,
  0 AS exam_fee
FROM generate_series(1, 12)
ON CONFLICT (class_level) DO NOTHING;

-- Enable RLS
ALTER TABLE IF EXISTS public.class_fees ENABLE ROW LEVEL SECURITY;

-- Policy for reading class fees (everyone can view)
DROP POLICY IF EXISTS "Public can read class fees" ON public.class_fees;
CREATE POLICY "Public can read class fees" ON public.class_fees
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Policy for admin to manage class fees
DROP POLICY IF EXISTS "Admin can manage class fees" ON public.class_fees;
CREATE POLICY "Admin can manage class fees" ON public.class_fees
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid()
    )
  );
