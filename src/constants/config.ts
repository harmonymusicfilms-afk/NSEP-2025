// Application Configuration
export const APP_CONFIG = {
  name: 'GPHDM National Scholarship Exam',
  shortName: 'GPHDM',
  fullName: 'GPHDM National Scholarship Exam',
  year: 2026,
  organization: 'Gram Panchayat Help DASK Mission',
  supportEmail: 'grampanchayathelp@gmail.com',
  supportPhone: '+91 9120057559',
  notificationGroupUrl: 'https://wa.me/919120057559',
  masterReferralCode: 'GPHDM2026',
} as const;

// Class-wise Exam Fees (Admin Configurable)
export const EXAM_FEES: Record<string, number> = {
  '1-5': 250,
  '6-8': 300,
  '9-12': 350,
};

export const getExamFee = (classNumber: number): number => {
  if (classNumber >= 1 && classNumber <= 5) return EXAM_FEES['1-5'];
  if (classNumber >= 6 && classNumber <= 8) return EXAM_FEES['6-8'];
  if (classNumber >= 9 && classNumber <= 12) return EXAM_FEES['9-12'];
  return 0;
};

// Exam Configuration
export const EXAM_CONFIG = {
  totalQuestions: 60,
  demoQuestionCount: 10, // For demo mode
  timePerQuestionOptions: [10, 15] as const, // seconds
  defaultTimePerQuestion: 10,
  gapBetweenQuestions: 60, // seconds
  marksPerCorrect: 4,
  marksPerWrong: -4, // Same negative marking
} as const;

// Center Code Reward
export const CENTER_REWARD = {
  amount: 25,
  currency: 'INR',
} as const;

// Scholarship Ranks Configuration
export const SCHOLARSHIP_CONFIG = {
  eligibleRanks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  types: ['AMOUNT', 'CERTIFICATE', 'BOTH'] as const,
  defaultAmounts: {
    1: 10000,
    2: 7500,
    3: 5000,
    4: 3000,
    5: 2000,
    6: 1500,
    7: 1000,
    8: 750,
    9: 500,
    10: 250,
  } as Record<number, number>,
} as const;

// Indian States for Address
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
] as const;

// Classes Array
export const CLASSES = Array.from({ length: 12 }, (_, i) => i + 1);

// Status Types
export const STUDENT_STATUS = ['ACTIVE', 'BLOCKED'] as const;
export const PAYMENT_STATUS = ['PENDING', 'SUCCESS', 'FAILED'] as const;
export const SCHOLARSHIP_STATUS = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export const REWARD_STATUS = ['PENDING', 'CREDITED', 'FAILED'] as const;

// Wallet Transaction Types
export const WALLET_TRANSACTION_TYPES = [
  'CENTER_REWARD',
  'SCHOLARSHIP_CREDIT',
  'ADMIN_ADJUSTMENT',
  'WITHDRAWAL',
] as const;

// Admin Roles
export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'] as const;

// Certificate Template Default Settings
export const DEFAULT_CERTIFICATE_SETTINGS = {
  defaultTemplate: 'CLASSIC' as const,
  templates: {
    classic: {
      template: 'CLASSIC' as const,
      primaryColor: '#1e3a8a',
      accentColor: '#d97706',
      sealUrl: '/images/gphdm_logo.png',
      signatureUrl: '/images/director_sig.png',
      sealText: 'GPHDM',
      institutionName: 'GPHDM National Scholarship Exam',
      tagline: 'Excellence in Education',
    },
    modern: {
      template: 'MODERN' as const,
      primaryColor: '#0f172a',
      accentColor: '#3b82f6',
      sealUrl: '/images/gphdm_logo.png',
      signatureUrl: '/images/director_sig.png',
      sealText: 'GPHDM',
      institutionName: 'GPHDM National Scholarship Exam',
      tagline: 'Empowering Future Leaders',
    },
    prestigious: {
      template: 'PRESTIGIOUS' as const,
      primaryColor: '#7c2d12',
      accentColor: '#b45309',
      sealUrl: '/images/gphdm_logo.png',
      signatureUrl: '/images/director_sig.png',
      sealText: 'GPHDM',
      institutionName: 'GPHDM National Scholarship Exam',
      tagline: 'Celebrating Academic Excellence',
    },
    gphdm: {
      template: 'GPHDM' as const,
      primaryColor: '#1e3a8a',
      accentColor: '#d97706',
      sealUrl: '/images/gphdm_logo.png',
      signatureUrl: '/images/director_sig.png',
      sealText: 'GPHDM',
      institutionName: 'GPHDM National Scholarship Exam',
      tagline: 'Empowering Rural Education',
    },
  },
};

// Local Storage Keys
export const STORAGE_KEYS = {
  students: 'gphdm_students',
  payments: 'gphdm_payments',
  centerRewards: 'gphdm_center_rewards',
  wallets: 'gphdm_wallets',
  walletTransactions: 'gphdm_wallet_transactions',
  examResults: 'gphdm_exam_results',
  scholarships: 'gphdm_scholarships',
  certificates: 'gphdm_certificates',
  adminUsers: 'gphdm_admin_users',
  adminLogs: 'gphdm_admin_logs',
  examConfig: 'gphdm_exam_config',
  certificateSettings: 'gphdm_certificate_settings',
  currentUser: 'gphdm_current_user',
  currentAdmin: 'gphdm_current_admin',
  examSessions: 'gphdm_exam_sessions',
  emailTemplates: 'gphdm_email_templates',
  emailDeliveries: 'gphdm_email_deliveries',
  referralCodes: 'gphdm_referral_codes',
  referralLogs: 'gphdm_referral_logs',
  centers: 'gphdm_centers',
  consentLogs: 'gphdm_consent_logs',
  contactSubmissions: 'gphdm_contact_submissions',
  galleryItems: 'gphdm_gallery_items',
} as const;

// Referral Configuration
export const REFERRAL_CONFIG = {
  adminCenterReward: 50, // Updated from 75
  centerCodeReward: 25, // Updated from 75
  studentReferralReward: 50, // Updated from 25
  adminCodePrefix: 'ADM',
  centerCodePrefix: 'CC',
  studentCodePrefix: 'STU',
} as const;

// Policy Versions
export const POLICY_CONFIG = {
  termsVersion: '1.0.0',
  privacyVersion: '1.0.0',
  referralPolicyVersion: '1.0.0',
  lastUpdated: '2026-01-15',
} as const;

// Razorpay Configuration
export const RAZORPAY_CONFIG = {
  key_id: 'rzp_test_RwZZrz8X7LH619',
  merchant_id: 'RuznqQuqyWvdel',
} as const;

