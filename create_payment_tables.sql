-- =============================================================================
-- Payment Tables Migration for InsForge
-- Run this SQL in the InsForge Dashboard SQL Editor to create all payment tables
-- =============================================================================

-- =============================================================================
-- 1. CENTER PAYMENTS TABLE
-- For tracking center registration fee payments
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.center_payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE,
    razorpay_order_id VARCHAR(255) NOT NULL,
    razorpay_payment_id VARCHAR(255),
    amount INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for center_payments center_id lookup
CREATE INDEX IF NOT EXISTS idx_center_payments_center_id ON public.center_payments(center_id);

-- =============================================================================
-- 2. PAYMENT REQUESTS TABLE
-- For manual payment submissions with QR code/bank transfer details
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.payment_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    class_level INTEGER NOT NULL,
    transaction_id TEXT NOT NULL,
    proof_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED')),
    rejected_reason TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    student_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 3. PAYMENT LOGS TABLE
-- For logging payment events
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.payment_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    center_id UUID NOT NULL REFERENCES public.centers(id),
    order_id VARCHAR(120),
    payment_id VARCHAR(120),
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_payment_logs_updated_at()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_payment_logs_updated_at ON public.payment_logs;
CREATE TRIGGER set_payment_logs_updated_at
    BEFORE UPDATE ON public.payment_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_logs_updated_at();

-- =============================================================================
-- 4. CLASS FEES TABLE
-- For configurable fees per class level
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.class_fees (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    class_level INTEGER NOT NULL UNIQUE CHECK (class_level BETWEEN 1 AND 12),
    joining_amount DECIMAL(10, 2) NOT NULL DEFAULT 250,
    exam_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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

-- =============================================================================
-- 5. ADD COLUMNS TO EXISTING TABLES
-- =============================================================================

-- Add UUID-based student_id column to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS student_id_uuid UUID REFERENCES public.students(id) ON DELETE CASCADE;

-- Add payment columns to centers table
ALTER TABLE public.centers 
ADD COLUMN IF NOT EXISTS transaction_id TEXT,
ADD COLUMN IF NOT EXISTS payment_screenshot_url TEXT,
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

COMMENT ON COLUMN centers.transaction_id IS 'Transaction / UTR ID for registration fee payment';
COMMENT ON COLUMN centers.payment_screenshot_url IS 'URL to the payment screenshot uploaded by the center principal';
COMMENT ON COLUMN centers.name IS 'Center name (new field)';
COMMENT ON COLUMN centers.email IS 'Center email (new field)';
COMMENT ON COLUMN centers.phone IS 'Center phone (new field)';
COMMENT ON COLUMN centers.address IS 'Center address (new field)';

-- Migrate data from old columns to new columns (if new columns are empty)
UPDATE public.centers SET name = COALESCE(name, center_name) WHERE name IS NULL OR name = '';
UPDATE public.centers SET email = COALESCE(email, owner_email) WHERE email IS NULL OR email = '';
UPDATE public.centers SET phone = COALESCE(phone, owner_mobile) WHERE phone IS NULL OR phone = '';
UPDATE public.centers SET address = COALESCE(address, center_address) WHERE address IS NULL OR address = '';

-- Update status values to uppercase if they are lowercase
UPDATE public.centers SET status = 'APPROVED' WHERE LOWER(status) = 'approved' OR LOWER(status) = 'active';

-- Add missing columns to payments table
ALTER TABLE IF EXISTS public.payments 
ADD COLUMN IF NOT EXISTS admin_remark TEXT,
ADD COLUMN IF NOT EXISTS application_id TEXT,
ADD COLUMN IF NOT EXISTS payment_date DATE,
ADD COLUMN IF NOT EXISTS proof_url TEXT,
ADD COLUMN IF NOT EXISTS transaction_id TEXT;

COMMENT ON COLUMN public.payments.admin_remark IS 'Admin remark for payment approval/rejection';
COMMENT ON COLUMN public.payments.application_id IS 'Auto-generated application ID for student tracking';
COMMENT ON COLUMN public.payments.payment_date IS 'Date of payment (auto-filled)';
COMMENT ON COLUMN public.payments.proof_url IS 'URL to payment proof screenshot';
COMMENT ON COLUMN public.payments.transaction_id IS 'Transaction ID / UTR from payment';

-- =============================================================================
-- 6. CREATE INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_payment_requests_student_id ON public.payment_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_submitted_at ON public.payment_requests(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_application_id ON public.payments(application_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payment_logs_center_id ON public.payment_logs(center_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_status ON public.payment_logs(status);

-- =============================================================================
-- 7. AUTO-GENERATE APPLICATION ID FUNCTION
-- =============================================================================
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

-- =============================================================================
-- 8. ENABLE RLS ON NEW TABLES
-- =============================================================================
ALTER TABLE public.center_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 9. RLS POLICIES
-- =============================================================================

-- Payment Requests Policies
CREATE POLICY "Students can view own payment requests"
    ON public.payment_requests FOR SELECT
    USING (
        auth.uid() = student_id OR
        EXISTS(
            SELECT 1 FROM public.admin_users
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all payment requests"
    ON public.payment_requests FOR ALL
    USING (
        EXISTS(
            SELECT 1 FROM public.admin_users
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Students can insert own payment requests"
    ON public.payment_requests FOR INSERT
    WITH CHECK (auth.uid() = student_id);

-- Payment Logs Policies (read for centers)
CREATE POLICY "Centers can view own payment logs"
    ON public.payment_logs FOR SELECT
    USING (
        center_id IN (SELECT id FROM public.centers WHERE id = auth.uid())
    );

CREATE POLICY "Admins can manage all payment logs"
    ON public.payment_logs FOR ALL
    USING (
        EXISTS(
            SELECT 1 FROM public.admin_users
            WHERE id = auth.uid()
        )
    );

-- Center Payments Policies
CREATE POLICY "Centers can view own payments"
    ON public.center_payments FOR SELECT
    USING (
        center_id IN (SELECT id FROM public.centers WHERE id = auth.uid())
    );

CREATE POLICY "Centers can insert own payments"
    ON public.center_payments FOR INSERT
    WITH CHECK (
        center_id IN (SELECT id FROM public.centers WHERE id = auth.uid())
    );

CREATE POLICY "Admins can manage all center payments"
    ON public.center_payments FOR ALL
    USING (
        EXISTS(
            SELECT 1 FROM public.admin_users
            WHERE id = auth.uid()
        )
    );

-- Class Fees Policies (public read)
CREATE POLICY "Public can read class fees" ON public.class_fees
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admin can manage class fees" ON public.class_fees
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid()
    )
  );

-- Payments Policies
CREATE POLICY "Admin full access to payments" ON public.payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Students can view own payments" ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    student_id = auth.uid() OR
    id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

-- =============================================================================
-- 10. TRIGGER FOR PAYMENT REQUEST APPROVAL
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_payment_request_approval()
RETURNS trigger AS $
BEGIN
    IF new.status = 'APPROVED' AND old.status != 'APPROVED' THEN
        -- Create payment record using UUID column
        INSERT INTO public.payments (student_id_uuid, razorpay_order_id, amount, status, paid_at)
        VALUES (new.student_id, 'MANUAL_' || new.id, new.amount, 'SUCCESS', now())
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN new;
END;
$ LANGUAGE plpgsql;

-- Create trigger for payment request approval
DROP TRIGGER IF EXISTS on_payment_request_approval ON public.payment_requests;
CREATE TRIGGER on_payment_request_approval
    AFTER UPDATE ON public.payment_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_payment_request_approval();

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
