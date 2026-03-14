-- =========================================================
-- RESET DATABASE STRUCTURE
-- Run this in InsForge SQL Editor to reset all tables
-- WARNING: This will delete ALL existing data!
-- =========================================================

-- Drop all existing tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS admin_logs CASCADE;
DROP TABLE IF EXISTS certificate_verifications CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS scholarships CASCADE;
DROP TABLE IF EXISTS exam_attempts CASCADE;
DROP TABLE IF EXISTS exam_results CASCADE;
DROP TABLE IF EXISTS answers CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- =========================================================
-- ADMIN USERS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120),
    email VARCHAR(150) UNIQUE,
    password_hash TEXT,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- STUDENTS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120),
    email VARCHAR(150) UNIQUE,
    mobile VARCHAR(15) UNIQUE,
    password_hash TEXT,
    class_level INT,
    aadhaar_number VARCHAR(12),
    aadhaar_file TEXT,
    referral_code VARCHAR(20) UNIQUE,
    referred_by VARCHAR(20),
    wallet_balance NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for students
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_mobile ON students(mobile);
CREATE INDEX IF NOT EXISTS idx_students_referral_code ON students(referral_code);
CREATE INDEX IF NOT EXISTS idx_students_class_level ON students(class_level);

-- =========================================================
-- PAYMENTS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id) ON DELETE CASCADE,
    payment_gateway VARCHAR(50),
    order_id VARCHAR(100),
    payment_id VARCHAR(100),
    amount NUMERIC(10,2),
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- REFERRALS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    referrer_student_id INT,
    referred_student_id INT,
    reward_amount NUMERIC(10,2) DEFAULT 50,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- WALLET TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(id),
    balance NUMERIC(10,2) DEFAULT 0
);

-- =========================================================
-- WALLET TRANSACTIONS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id SERIAL PRIMARY KEY,
    wallet_id INT REFERENCES wallets(id),
    type VARCHAR(20),
    amount NUMERIC(10,2),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- EXAMS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS exams (
    id SERIAL PRIMARY KEY,
    exam_name VARCHAR(150),
    class_level INT,
    total_questions INT,
    exam_time INT,
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- QUESTIONS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    exam_id INT REFERENCES exams(id),
    question_text TEXT,
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    correct_option VARCHAR(2),
    marks NUMERIC(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- ANSWERS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS answers (
    id SERIAL PRIMARY KEY,
    student_id INT,
    question_id INT,
    selected_option VARCHAR(2),
    is_correct BOOLEAN,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- EXAM ATTEMPTS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS exam_attempts (
    id SERIAL PRIMARY KEY,
    student_id INT,
    exam_id INT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(20)
);

-- =========================================================
-- EXAM RESULTS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS exam_results (
    id SERIAL PRIMARY KEY,
    student_id INT,
    exam_id INT,
    total_score NUMERIC(10,2),
    correct_answers INT,
    wrong_answers INT,
    rank_position INT,
    result_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for ranking
CREATE INDEX IF NOT EXISTS idx_exam_results_rank ON exam_results(rank_position);

-- =========================================================
-- SCHOLARSHIPS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS scholarships (
    id SERIAL PRIMARY KEY,
    class_category VARCHAR(50),
    rank_from INT,
    rank_to INT,
    amount NUMERIC(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- CERTIFICATES TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS certificates (
    id SERIAL PRIMARY KEY,
    student_id INT,
    exam_result_id INT,
    certificate_id VARCHAR(50) UNIQUE,
    certificate_type VARCHAR(50),
    pdf_url TEXT,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- CERTIFICATE VERIFICATION TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS certificate_verifications (
    id SERIAL PRIMARY KEY,
    certificate_id VARCHAR(50),
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50)
);

-- =========================================================
-- ADMIN LOGS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS admin_logs (
    id SERIAL PRIMARY KEY,
    admin_id INT,
    action TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- SETTINGS TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100),
    setting_value TEXT
);

-- =========================================================
-- RANKING ENGINE FUNCTION
-- =========================================================
CREATE OR REPLACE FUNCTION calculate_ranks()
RETURNS VOID AS $$
BEGIN
    UPDATE exam_results r
    SET rank_position = sub.rank
    FROM (
        SELECT id, RANK() OVER (ORDER BY total_score DESC) AS rank
        FROM exam_results
    ) sub
    WHERE r.id = sub.id;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- REFERRAL WALLET TRIGGER
-- =========================================================
CREATE OR REPLACE FUNCTION referral_reward()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE wallets
    SET balance = balance + 50
    WHERE student_id = NEW.referrer_student_id;

    INSERT INTO wallet_transactions(wallet_id, type, amount, description)
    VALUES(
        (SELECT id FROM wallets WHERE student_id = NEW.referrer_student_id),
        'credit',
        50,
        'Referral reward'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS referral_reward_trigger ON referrals;
CREATE TRIGGER referral_reward_trigger
AFTER INSERT ON referrals
FOR EACH ROW
EXECUTE FUNCTION referral_reward();

-- =========================================================
-- Refresh PostgREST cache
-- =========================================================
NOTIFY pgrst, 'reload schema';

-- Success message
SELECT 'All tables created successfully!' AS result;
