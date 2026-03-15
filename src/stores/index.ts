import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Student,
  Payment,
  PaymentRequest,
  CenterReward,
  Wallet,
  WalletTransaction,
  ExamResult,
  Scholarship,
  Certificate,
  AdminUser,
  AdminLog,
  ExamSession,
  ExamQuestion,
  ExamConfigSettings,
  CertificateSettings,
  CertificateTemplate,
  CertificateTemplateConfig,
  EmailTemplate,
  EmailDelivery,
  BatchEmailJob,
  Syllabus,
  SyllabusTopic,
  ExamSchedule,
  NotificationDispatchLog,
  AIGenerationReport,
} from '@/types';
import { SyllabusService } from '@/lib/syllabusService';
import { AIExamService } from '@/lib/aiExamService';
import { ExamSchedulerService } from '@/lib/examSchedulerService';
import { STORAGE_KEYS, EXAM_CONFIG, EXAM_FEES, CENTER_REWARD, DEFAULT_CERTIFICATE_SETTINGS, REFERRAL_CONFIG, SCHOLARSHIP_CONFIG } from '@/constants/config';
import { generateId, generateCenterCode, generateOrderId, generatePaymentId, generateCertificateId, generateStudentReferralCode } from '@/lib/utils';
import { sendEmailNotification } from '@/lib/emailNotifications';
import { initializeMockData, mockExamQuestions } from '@/constants/mockData';
import { client as backend } from '@/lib/backend';
import type { DashboardStats, ClassWiseStats as ClassStats, ReferralCodeType, ReferralCode, ReferralLog, Center, GalleryItem } from '@/types';

// Mapping Helpers for backend (snake_case) to Frontend (camelCase)
const mapStudent = (data: any): Student => ({
  id: data.id,
  name: data.name,
  fatherName: data.father_name,
  class: data.class || data.class_level || 0,
  mobile: data.mobile,
  email: data.email,
  schoolName: data.school_name,
  schoolContact: data.school_contact,
  addressVillage: data.address_village,
  addressBlock: data.address_block,
  addressTahsil: data.address_tahsil,
  addressDistrict: data.address_district,
  addressState: data.address_state,
  photoUrl: data.photo_url,
  centerCode: data.center_code,
  referralCode: data.referral_code,
  referredByCenter: data.referred_by_center || data.referred_by_center_code,
  referredByStudent: data.referred_by_student,
  status: data.payment_status || data.status || 'PENDING',
  payment_status: data.payment_status || data.status || 'PENDING',
  password: data.password || '',
  createdAt: data.created_at,
  mobileVerified: data.mobile_verified,
  emailVerified: data.email_verified,
});

const mapPayment = (data: any): Payment => ({
  id: data.id,
  studentId: data.student_id,
  razorpayOrderId: data.razorpay_order_id,
  razorpayPaymentId: data.razorpay_payment_id,
  razorpaySignature: data.razorpay_signature,
  proofUrl: data.proof_url,
  transactionId: data.transaction_id,
  applicationId: data.application_id,
  adminRemark: data.admin_remark,
  amount: Number(data.amount),
  status: data.status,
  paidAt: data.paid_at,
  createdAt: data.created_at,
});

const mapPaymentRequest = (data: any): PaymentRequest => ({
  id: data.id,
  studentId: data.student_id,
  studentName: data.student_name,
  amount: Number(data.amount),
  classLevel: data.class_level,
  transactionId: data.transaction_id,
  proofUrl: data.proof_url,
  status: data.status,
  rejectedReason: data.rejected_reason,
  submittedAt: data.submitted_at,
  reviewedAt: data.reviewed_at,
  reviewedBy: data.reviewed_by,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

const mapCenterReward = (data: any): CenterReward => ({
  id: data.id,
  centerOwnerStudentId: data.center_owner_student_id,
  newStudentId: data.new_student_id,
  paymentId: data.payment_id,
  rewardAmount: Number(data.reward_amount),
  status: data.status,
  createdAt: data.created_at,
});

const mapReferralCode = (data: any): ReferralCode => ({
  id: data.id,
  code: data.code,
  type: data.type,
  ownerId: data.owner_id,
  ownerName: data.owner_name,
  rewardAmount: Number(data.reward_amount),
  isActive: data.is_active,
  totalReferrals: data.total_referrals,
  totalEarnings: Number(data.total_earnings),
  createdAt: data.created_at,
  createdBy: data.created_by,
});

const mapReferralLog = (data: any): ReferralLog => ({
  id: data.id,
  referralCodeId: data.referral_code_id,
  referralCode: data.referral_code,
  referrerId: data.referrer_id,
  referrerRole: data.referrer_role === 'ADMIN_CENTER' ? 'ADMIN' : data.referrer_role,
  newUserId: data.new_user_id,
  newUserName: data.new_user_name,
  amount: Number(data.amount),
  status: data.status,
  ipAddress: data.ip_address,
  createdAt: data.created_at,
});

const mapCenter = (data: any): Center => ({
  id: data.id,
  userId: data.user_id,
  name: data.center_name,
  centerType: data.center_type,
  ownerName: data.owner_name,
  ownerPhone: data.owner_mobile,
  ownerEmail: data.owner_email,
  ownerAadhaar: data.owner_aadhaar,
  address: data.center_address,
  village: data.village,
  block: data.block,
  state: data.state,
  district: data.district,
  pincode: data.pincode,
  centerCode: data.center_code,
  status: data.status,
  idProofUrl: data.id_proof_url,
  createdAt: data.created_at,
  totalStudents: 0,
  totalEarnings: 0,
});

const mapExamResult = (data: any): ExamResult => ({
  id: data.id,
  studentId: data.student_id,
  class: data.class || data.class_level || 0,
  totalScore: data.total_score,
  correctCount: data.correct_count,
  wrongCount: data.wrong_count,
  unansweredCount: data.unanswered_count,
  totalTimeTaken: data.total_time_taken,
  rank: data.rank,
  resultStatus: data.result_status,
  createdAt: data.created_at,
});

const mapScholarship = (data: any): Scholarship => ({
  id: data.id,
  studentId: data.student_id,
  class: data.class || data.class_level || 0,
  rank: data.rank,
  scholarshipType: data.scholarship_type,
  amount: data.amount ? Number(data.amount) : undefined,
  approvalStatus: data.approval_status,
  approvedBy: data.approved_by,
  approvedAt: data.approved_at,
  rejectionReason: data.rejection_reason,
  createdAt: data.created_at,
});

const mapExamSession = (data: any): ExamSession => ({
  id: data.id,
  studentId: data.student_id,
  class: data.class || data.class_level || 0,
  startedAt: data.started_at,
  currentQuestionIndex: data.current_question_index,
  answers: data.answers || [],
  status: data.status,
  totalTimeSpent: data.total_time_spent || 0,
  ipAddress: data.ip_address,
  userAgent: data.user_agent,
});

const mapCertificate = (data: any): Certificate => ({
  id: data.id,
  studentId: data.student_id,
  examResultId: data.exam_result_id,
  certificateId: data.certificate_id_display,
  certificateType: data.certificate_type,
  pdfUrl: data.pdf_url,
  qrCode: data.qr_code_url,
  issuedAt: data.issued_at,
  isValid: data.is_valid,
});

const mapExamQuestion = (data: any): ExamQuestion => ({
  id: data.id,
  class: data.class || data.class_level || 0,
  questionText: data.question_text,
  options: data.options || [],
  correctOptionIndex: data.correct_option_index,
  subject: data.subject,
  questionFileUrl: data.question_file_url,
});

const mapWallet = (data: any): Wallet => ({
  id: data.id,
  studentId: data.student_id,
  balance: Number(data.balance),
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

const mapWalletTransaction = (data: any): WalletTransaction => ({
  id: data.id,
  walletId: data.wallet_id,
  type: data.type,
  amount: Number(data.amount),
  reason: data.reason,
  referenceId: data.reference_id,
  createdAt: data.created_at,
});

const mapEmailTemplate = (data: any): EmailTemplate => ({
  id: data.id,
  name: data.name,
  subject: data.subject,
  bodyHtml: data.body_html,
  variables: data.variables,
  isDefault: data.is_default,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

const mapEmailDelivery = (data: any): EmailDelivery => ({
  id: data.id,
  studentId: data.student_id,
  certificateId: data.certificate_id,
  templateId: data.template_id,
  recipientEmail: data.recipient_email,
  subject: data.subject,
  status: data.status,
  sentAt: data.sent_at,
  failedAt: data.failed_at,
  errorMessage: data.error_message,
  retryCount: data.retry_count,
  lastRetryAt: data.last_retry_at,
  createdAt: data.created_at,
});

// Initialize mock data on first load
// initializeMockData();

// Helper to get data from localStorage
const getStoredData = <T>(key: string, defaultValue: T): T => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultValue;
};

// Helper to set data in localStorage
const setStoredData = <T>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Auth Store
interface AuthState {
  currentStudent: Student | null;
  currentAdmin: AdminUser | null;
  currentCenter: Center | null;
  isStudentLoggedIn: boolean;
  isAdminLoggedIn: boolean;
  isCenterLoggedIn: boolean;
  isLoading: boolean;
  setStudent: (student: Student | null) => void;
  setAdmin: (admin: AdminUser | null) => void;
  setCenter: (center: Center | null) => void;
  loginStudent: (email: string, mobile: string) => Promise<Student | null>;
  logoutStudent: () => Promise<void>;
  loginCenter: (email: string, password: string) => Promise<Center | null>;
  logoutCenter: () => Promise<void>;
  loginAdmin: (email: string, password: string) => Promise<AdminUser | null>;
  setupAdmin: (email: string, password: string) => Promise<AdminUser | null>;
  logoutAdmin: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentStudent: null,
  currentAdmin: null,
  currentCenter: null,
  isStudentLoggedIn: false,
  isAdminLoggedIn: false,
  isCenterLoggedIn: false,
  isLoading: false,

  setStudent: (student) => set({
    currentStudent: student,
    isStudentLoggedIn: !!student,
  }),

  setAdmin: (admin) => set({
    currentAdmin: admin,
    isAdminLoggedIn: !!admin,
  }),

  setCenter: (center) => set({
    currentCenter: center,
    isCenterLoggedIn: !!center,
  }),

  loginStudent: async (email, mobile) => {
    set({ isLoading: true });
    try {
      // For students, we use email/mobile as "passwordless" or custom logic
      // But for now, let's just fetch the student record if it matches
      const { data, error } = await backend
        .from('students')
        .select('*')
        .eq('email', email)
        .eq('mobile', mobile)
        .in('status', ['ACTIVE', 'PENDING'])
        .maybeSingle();

      if (error) throw error;
      const student = mapStudent(data);
      set({ currentStudent: student, isStudentLoggedIn: true });
      return student;
    } catch (error) {
      console.error('Login error:', error);
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  logoutStudent: async () => {
    await backend.auth.signOut();
    set({ currentStudent: null, isStudentLoggedIn: false });
  },

  loginCenter: async (email, password) => {
    set({ isLoading: true });
    try {
      // First check if center exists with this email
      const { data: centerData, error: centerError } = await backend
        .from('centers')
        .select('*')
        .eq('owner_email', email.trim())
        .maybeSingle();

      if (centerError || !centerData) {
        throw new Error('Center not found with this email');
      }

      // Check if center is approved
      if (centerData.status !== 'APPROVED') {
        throw new Error('Your center registration is not yet approved. Please wait for admin approval.');
      }

      // Try auth sign in
      const { data: authData, error: authError } = await backend.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      // If auth fails, still allow login if center is approved (for simple demo)
      if (authError) {
        console.warn('Auth failed but center exists:', authError.message);
      }

      const center = mapCenter(centerData);
      set({ currentCenter: center, isCenterLoggedIn: true });
      return center;
    } catch (error: any) {
      console.error('Center login error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logoutCenter: async () => {
    await backend.auth.signOut();
    set({ currentCenter: null, isCenterLoggedIn: false });
  },

  loginAdmin: async (email, password) => {
    set({ isLoading: true });
    try {
      // ✅ NEW ADMIN LOGIN SYSTEM - Use database credentials
      const superAdminEmail = 'admin@gphdm.com';
      const superAdminPassword = 'admin123';

      // Check if login matches the new database credentials
      if (email.toLowerCase().trim() === superAdminEmail && password === superAdminPassword) {
        // First, check if admin exists in admin_users table
        const { data: existingAdmin } = await backend
          .from('admin_users')
          .select('*')
          .eq('email', superAdminEmail)
          .eq('role', 'SUPER_ADMIN')
          .maybeSingle();

        // Try to sign in with Supabase Auth
        await backend.auth.signOut();
        let { data: authData, error: authError } = await backend.auth.signInWithPassword({
          email: superAdminEmail,
          password: superAdminPassword,
        });

        // If auth user doesn't exist, create it
        if (authError && authError.message.toLowerCase().includes('invalid login credentials')) {
          const signUpRes = await backend.auth.signUp({
            email: superAdminEmail,
            password: superAdminPassword,
          });

          if (signUpRes.error) {
            throw new Error('Failed to create admin user: ' + signUpRes.error.message);
          }

          if (!signUpRes.data?.user) {
            throw new Error('Failed to create admin user: No user data');
          }

          authData = signUpRes.data as any;
          authError = null;
        }

        if (authError || !authData?.user) {
          throw new Error('Admin authentication failed: ' + (authError?.message || 'No user data'));
        }

        // If admin doesn't exist in admin_users table, create it
        if (!existingAdmin) {
          const { error: insertError } = await backend.from('admin_users').insert([{
            id: authData.user.id,
            name: 'Super Admin',
            email: superAdminEmail,
            role: 'SUPER_ADMIN',
            password_hash: superAdminPassword,
            last_login: new Date().toISOString()
          }]);

          if (insertError) {
            console.error('Could not create admin user:', insertError);
          }
        } else {
          // Update existing admin with the auth user id
          await backend.from('admin_users').update({
            id: authData.user.id,
            password_hash: superAdminPassword,
            last_login: new Date().toISOString()
          }).eq('email', superAdminEmail);
        }

        const admin: AdminUser = {
          id: authData.user.id,
          name: 'Super Admin',
          email: superAdminEmail,
          role: 'SUPER_ADMIN',
          createdAt: new Date().toISOString(),
          passwordHash: '',
          lastLogin: new Date().toISOString()
        };
        set({ currentAdmin: admin, isAdminLoggedIn: true });
        return admin;
      }

      // Normal admin login via backend Auth
      await backend.auth.signOut();
      const { data: authData, error: authError } = await backend.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Admin authentication failed');

      // Fetch admin profile
      let admin: AdminUser | null = null;

      try {
        const { data, error } = await backend
          .from('admin_users')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (data) {
          admin = data as AdminUser;
        } else {
          throw error || new Error('You are not authorized as an admin.');
        }
      } catch (err) {
        throw err;
      }

      const currentAdmin = admin!;

      // Update last login (fire and forget)
      backend.from('admin_users').update({
        last_login: new Date().toISOString()
      }).eq('id', currentAdmin.id).then();

      set({ currentAdmin: currentAdmin, isAdminLoggedIn: true });
      return currentAdmin;
    } catch (error: any) {
      console.error('Admin login error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  setupAdmin: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data: authData, error: authError } = await backend.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (authError && authError.message !== 'User already registered') {
        throw authError; // throw real errors normally 
      }

      // If user was already registered or just signed up, try to sign in
      const { data: signInData, error: signInError } = await backend.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (signInError) throw signInError;
      if (!signInData.user) throw new Error('Admin login failed after setup');

      const admin = {
        id: signInData.user.id,
        name: 'Gram Panchayat Admin',
        email: email,
        role: 'SUPER_ADMIN',
        createdAt: new Date().toISOString(),
        passwordHash: '',
        lastLogin: new Date().toISOString()
      };

      // Ensure they exist in admin_users table (upsert is safest)
      const { error: adminError } = await backend
        .from('admin_users')
        .upsert([{
          id: signInData.user.id,
          name: 'Gram Panchayat',
          email: email,
          role: 'SUPER_ADMIN',
          last_login: new Date().toISOString()
        }]);

      if (adminError && adminError.code !== '23505') {
        console.warn('Could not insert admin user (might be RLS blocked, relying on local fallback):', adminError);
      }

      set({ currentAdmin: admin as AdminUser, isAdminLoggedIn: true });
      return admin as AdminUser;
    } catch (error: any) {
      console.error('Admin setup error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logoutAdmin: async () => {
    set({ currentAdmin: null, isAdminLoggedIn: false });
  },
}));

// Student Store
interface StudentState {
  students: Student[];
  isLoading: boolean;
  loadStudents: () => Promise<void>;
  addStudent: (data: Omit<Student, 'id' | 'centerCode' | 'status' | 'createdAt' | 'mobileVerified' | 'emailVerified'>, userId: string) => Promise<Student | null>;
  updateStudent: (id: string, data: Partial<Student>) => Promise<Student | void>;
  getStudentById: (id: string) => Promise<Student | null>;
  getStudentByEmail: (email: string) => Promise<Student | null>;
  getStudentByMobile: (mobile: string) => Promise<Student | null>;
  getStudentByCenterCode: (code: string) => Promise<Student | null>;
  getStudentByReferralCode: (code: string) => Promise<Student | null>;
  blockStudent: (id: string) => Promise<void>;
  unblockStudent: (id: string) => Promise<void>;
}

export const useStudentStore = create<StudentState>((set, get) => ({
  students: [],
  isLoading: false,

  loadStudents: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await backend.from('students').select('*').order('created_at', { ascending: false });
      if (error) {
        // If table doesn't exist, try localStorage
        if (error.code === '42P01') {
          console.warn('students table does not exist, using localStorage');
          const localStudentsStr = localStorage.getItem('gphdm_students');
          const localStudents = localStudentsStr ? JSON.parse(localStudentsStr) : [];
          set({ students: localStudents.map(mapStudent) });
          return;
        }
        throw error;
      }
      set({ students: (data || []).map(mapStudent) });
    } catch (error) {
      console.error('Error loading students:', error);
      // Fallback to localStorage
      const localStudentsStr = localStorage.getItem('gphdm_students');
      const localStudents = localStudentsStr ? JSON.parse(localStudentsStr) : [];
      set({ students: localStudents.map(mapStudent) });
    } finally {
      set({ isLoading: false });
    }
  },

  addStudent: async (data, userId) => {
    if (!data.name?.trim()) {
      throw new Error("Full name is required");
    }

    const centerCode = generateCenterCode();
    const referralCode = generateStudentReferralCode(userId);
    console.log('DEBUG: addStudent receiving data:', data);
    console.log('Adding student to DB...', { userId, centerCode, referralCode });
    try {
      const studentData = {
        id: userId,
        full_name: data.name, // Ensure this matches exactly the DB column name
        name: data.name,
        father_name: data.fatherName,
        class: data.class,
        class_level: data.class,
        mobile: data.mobile,
        email: data.email,
        school_name: data.schoolName,
        school_contact: data.schoolContact,
        address_village: data.addressVillage,
        address_block: data.addressBlock,
        address_tahsil: data.addressTahsil,
        address_district: data.addressDistrict,
        address_state: data.addressState,
        photo_url: data.photoUrl || null,
        center_code: centerCode,
        referral_code: referralCode,
        referred_by_center: data.referredByCenter || null,
        referred_by_center_code: data.referredByCenter || null,
        referred_by_student: data.referredByStudent || null,
        status: 'PENDING',
        payment_status: 'Pending',
        password: data.password || '',
        class_selected: data.class,
      };

      console.log('DEBUG: Final studentData for DB:', studentData);

      const { data: newStudent, error } = await backend
        .from('students')
        .upsert([studentData])
        .select()
        .maybeSingle();

      if (error) {
        console.error('DATABASE ERROR (students upsert):', error.message, error.details, error.hint);
        if (error.message.toLowerCase().includes('duplicate') || error.message.toLowerCase().includes('already exists')) {
          throw new Error('This Mobile number or ID is already in use by another account.');
        }
        throw error;
      }

      const student = mapStudent(newStudent);
      set({ students: [student, ...get().students] });

      // Send registration confirmation email
      try {
        sendEmailNotification('REGISTRATION_CONFIRMATION', student.email, {
          studentName: student.name,
          studentEmail: student.email,
          class: student.class,
          centerCode: student.centerCode,
        });
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        // Don't fail the whole registration if email fails
      }

      return student;
    } catch (error: any) {
      console.error('Error in addStudent store method:', error);
      throw error; // Throw so the UI can catch the specific error
    }
  },

  updateStudent: async (id, data) => {
    try {
      // Map frontend camelCase to backend snake_case if they exist in data
      const dbUpdate: any = { ...data };
      if (data.name) {
        dbUpdate.name = data.name;
        dbUpdate.full_name = data.name;
      }
      if (data.fatherName) dbUpdate.father_name = data.fatherName;
      if (data.class) {
        dbUpdate.class = data.class;
        dbUpdate.class_level = data.class;
      }
      if (data.schoolName) dbUpdate.school_name = data.schoolName;
      if (data.schoolContact) dbUpdate.school_contact = data.schoolContact;
      if (data.addressVillage) dbUpdate.address_village = data.addressVillage;
      if (data.addressBlock) dbUpdate.address_block = data.addressBlock;
      if (data.addressTahsil) dbUpdate.address_tahsil = data.addressTahsil;
      if (data.addressDistrict) dbUpdate.address_district = data.addressDistrict;
      if (data.addressState) dbUpdate.address_state = data.addressState;
      if (data.photoUrl !== undefined) dbUpdate.photo_url = data.photoUrl;
      if (data.referredByCenter) dbUpdate.referred_by_center = data.referredByCenter;
      if (data.referredByStudent) dbUpdate.referred_by_student = data.referredByStudent;

      // Remove frontend-only keys
      delete dbUpdate.fatherName;
      delete dbUpdate.class;
      delete dbUpdate.schoolName;
      delete dbUpdate.schoolContact;
      delete dbUpdate.addressVillage;
      delete dbUpdate.addressBlock;
      delete dbUpdate.addressTahsil;
      delete dbUpdate.addressDistrict;
      delete dbUpdate.addressState;
      delete dbUpdate.photoUrl;
      delete dbUpdate.referredByCenter;
      delete dbUpdate.referredByStudent;

      const { data: updatedData, error } = await backend
        .from('students')
        .update(dbUpdate)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;

      const updatedStudent = mapStudent(updatedData);

      set((state) => ({
        students: state.students.map((s) => (s.id === id ? updatedStudent : s)),
      }));

      return updatedStudent;
    } catch (error: any) {
      console.error('Error updating student:', error);
      throw error;
    }
  },

  getStudentById: async (id) => {
    const { data, error } = await backend.from('students').select('*').eq('id', id).maybeSingle();
    if (error) return null;
    return data as Student;
  },

  getStudentByEmail: async (email) => {
    const { data, error } = await backend.from('students').select('*').eq('email', email).maybeSingle();
    if (error) return null;
    return data as Student;
  },

  getStudentByMobile: async (mobile) => {
    const { data, error } = await backend.from('students').select('*').eq('mobile', mobile).maybeSingle();
    if (error) return null;
    return data as Student;
  },

  getStudentByCenterCode: async (code) => {
    const { data, error } = await backend.from('students').select('*').eq('center_code', code).maybeSingle();
    if (error) return null;
    return mapStudent(data);
  },

  getStudentByReferralCode: async (code) => {
    const { data, error } = await backend.from('students').select('*').eq('referral_code', code).maybeSingle();
    if (error) return null;
    return mapStudent(data);
  },

  blockStudent: async (id) => {
    await get().updateStudent(id, { status: 'BLOCKED' });
  },

  unblockStudent: async (id) => {
    await get().updateStudent(id, { status: 'ACTIVE' });
  },
}));

// Payment Store
interface PaymentState {
  payments: Payment[];
  isLoading: boolean;
  loadPayments: () => Promise<void>;
  createPayment: (studentId: string, amount: number) => Promise<Payment | null>;
  verifyPayment: (paymentId: string, razorpayPaymentId: string, signature: string) => Promise<Payment | null>;
  submitManualPayment: (paymentId: string, transactionId: string, proofUrl: string) => Promise<Payment | null>;
  failPayment: (paymentId: string) => Promise<void>;
  approvePayment: (paymentId: string) => Promise<void>;
  rejectPayment: (paymentId: string, remark: string) => Promise<void>;
  markPaymentPending: (paymentId: string) => Promise<void>;
  getPaymentsByStudent: (studentId: string) => Payment[];
  hasSuccessfulPayment: (studentId: string) => boolean;
}

export const usePaymentStore = create<PaymentState>((set, get) => ({
  payments: [],
  isLoading: false,

  loadPayments: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await backend.from('payments').select('*').order('created_at', { ascending: false });
      if (error) {
        // If table doesn't exist, try localStorage
        if (error.code === '42P01') {
          console.warn('payments table does not exist, using localStorage');
          const localPaymentsStr = localStorage.getItem('gphdm_payments');
          const localPayments = localPaymentsStr ? JSON.parse(localPaymentsStr) : [];
          set({ payments: localPayments });
          return;
        }
        throw error;
      }
      set({ payments: (data || []).map(mapPayment) });
    } catch (error) {
      console.error('Error loading payments:', error);
      // Fallback to localStorage
      const localPaymentsStr = localStorage.getItem('gphdm_payments');
      const localPayments = localPaymentsStr ? JSON.parse(localPaymentsStr) : [];
      set({ payments: localPayments });
    } finally {
      set({ isLoading: false });
    }
  },

  createPayment: async (studentId, amount) => {
    console.log('Creating payment for student:', studentId, 'amount:', amount);
    try {
      const { data, error } = await backend
        .from('payments')
        .insert([{
          student_id: studentId,
          razorpay_order_id: generateOrderId(),
          amount,
          status: 'PENDING',
        }])
        .select()
        .maybeSingle();

      if (error) {
        console.error('backend payment insert error:', error);
        throw error;
      }
      const payment = mapPayment(data);
      set({ payments: [payment, ...get().payments] });
      return payment;
    } catch (error: any) {
      console.error('Catch block in createPayment:', error.message || error);
      return null;
    }
  },

  verifyPayment: async (paymentId, razorpayPaymentId, signature) => {
    try {
      const { data, error } = await backend
        .from('payments')
        .update({
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: signature,
          status: 'SUCCESS',
          paid_at: new Date().toISOString(),
        })
        .eq('id', paymentId)
        .select()
        .maybeSingle();

      if (error) throw error;
      const updatedPayment = mapPayment(data);

      // Update student status to ACTIVE once payment is verified
      await useStudentStore.getState().updateStudent(updatedPayment.studentId, { status: 'ACTIVE' });

      set({
        payments: get().payments.map((p) => (p.id === paymentId ? updatedPayment : p)),
      });

      // Send payment receipt email
      const { data: student } = await backend
        .from('students')
        .select('*')
        .eq('id', updatedPayment.studentId)
        .maybeSingle();

      if (student) {
        sendEmailNotification('PAYMENT_RECEIPT', student.email, {
          studentName: student.name,
          studentEmail: student.email,
          paymentId: razorpayPaymentId,
          amount: updatedPayment.amount,
          date: new Date().toISOString(),
          centerCode: student.center_code,
        });
      }

      return updatedPayment;
    } catch (error) {
      console.error('Error verifying payment:', error);
      return null;
    }
  },

  submitManualPayment: async (paymentId, transactionId, proofUrl) => {
    try {
      const { data, error } = await backend
        .from('payments')
        .update({
          transaction_id: transactionId,
          proof_url: proofUrl,
          status: 'PENDING', // Awaiting admin approval
          paid_at: new Date().toISOString(),
        })
        .eq('id', paymentId)
        .select()
        .maybeSingle();

      if (error) throw error;
      const updatedPayment = mapPayment(data);

      set({
        payments: get().payments.map((p) => (p.id === paymentId ? updatedPayment : p)),
      });

      return updatedPayment;
    } catch (error) {
      console.error('Error submitting manual payment:', error);
      return null;
    }
  },

  failPayment: async (paymentId) => {
    try {
      const { error } = await backend
        .from('payments')
        .update({ status: 'FAILED' })
        .eq('id', paymentId);
      if (error) throw error;
      set({
        payments: get().payments.map((p) =>
          p.id === paymentId ? { ...p, status: 'FAILED' } : p
        ),
      });
    } catch (error) {
      console.error('Error failing payment:', error);
    }
  },

  approvePayment: async (paymentId) => {
    try {
      const payment = get().payments.find(p => p.id === paymentId);
      if (!payment) return;

      const { data, error } = await backend
        .from('payments')
        .update({
          status: 'SUCCESS',
          paid_at: new Date().toISOString(),
          razorpay_payment_id: `manual_${Date.now()}`
        })
        .eq('id', paymentId)
        .select()
        .maybeSingle();

      if (error) throw error;
      const updatedPayment = mapPayment(data);

      // Update student status to ACTIVE
      await useStudentStore.getState().updateStudent(updatedPayment.studentId, { status: 'ACTIVE' });

      set({
        payments: get().payments.map((p) => (p.id === paymentId ? updatedPayment : p)),
      });
    } catch (error) {
      console.error('Error approving payment:', error);
      throw error;
    }
  },

  rejectPayment: async (paymentId, remark: string) => {
    try {
      const payment = get().payments.find(p => p.id === paymentId);
      if (!payment) return;

      const { data, error } = await backend
        .from('payments')
        .update({
          status: 'FAILED',
          admin_remark: remark,
        })
        .eq('id', paymentId)
        .select()
        .maybeSingle();

      if (error) throw error;
      const updatedPayment = mapPayment(data);

      set({
        payments: get().payments.map((p) => (p.id === paymentId ? updatedPayment : p)),
      });
    } catch (error) {
      console.error('Error rejecting payment:', error);
      throw error;
    }
  },

  markPaymentPending: async (paymentId) => {
    try {
      const payment = get().payments.find(p => p.id === paymentId);
      if (!payment) return;

      const { data, error } = await backend
        .from('payments')
        .update({
          status: 'PENDING',
          paid_at: null,
          razorpay_payment_id: null,
          razorpay_signature: null
        })
        .eq('id', paymentId)
        .select()
        .maybeSingle();

      if (error) throw error;
      const updatedPayment = mapPayment(data);

      // We might also update the student to 'PENDING', but they might have other success payments
      // For safety, let's update student status back to PENDING if they have no other successful payments
      const otherPayments = get().payments.filter(p => p.studentId === updatedPayment.studentId && p.id !== paymentId && p.status === 'SUCCESS');
      if (otherPayments.length === 0) {
        await useStudentStore.getState().updateStudent(updatedPayment.studentId, { status: 'PENDING' });
      }

      set({
        payments: get().payments.map((p) => (p.id === paymentId ? updatedPayment : p)),
      });
    } catch (error) {
      console.error('Error marking payment as pending:', error);
      throw error;
    }
  },

  getPaymentsByStudent: (studentId) => get().payments.filter((p) => p.studentId === studentId),
  hasSuccessfulPayment: (studentId) =>
    get().payments.some((p) => p.studentId === studentId && p.status === 'SUCCESS'),
}));

// Payment Request Store (for manual payment submissions)
interface PaymentRequestState {
  paymentRequests: PaymentRequest[];
  isLoading: boolean;
  loadPaymentRequests: () => Promise<void>;
  submitPaymentRequest: (studentId: string, amount: number, classLevel: number, transactionId: string, proofUrl: string, studentName: string) => Promise<PaymentRequest | null>;
  approvePaymentRequest: (requestId: string) => Promise<void>;
  rejectPaymentRequest: (requestId: string, reason: string) => Promise<void>;
  getPendingRequests: () => PaymentRequest[];
  getByStudent: (studentId: string) => PaymentRequest[];
}

export const usePaymentRequestStore = create<PaymentRequestState>((set, get) => ({
  paymentRequests: [],
  isLoading: false,

  loadPaymentRequests: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await backend
        .from('payment_requests')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          console.warn('payment_requests table does not exist');
          set({ paymentRequests: [] });
          return;
        }
        throw error;
      }
      set({ paymentRequests: (data || []).map(mapPaymentRequest) });
    } catch (error) {
      console.error('Error loading payment requests:', error);
      set({ paymentRequests: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  submitPaymentRequest: async (studentId, amount, classLevel, transactionId, proofUrl, studentName) => {
    try {
      const { data, error } = await backend
        .from('payment_requests')
        .insert([{
          student_id: studentId,
          amount,
          class_level: classLevel,
          transaction_id: transactionId,
          proof_url: proofUrl,
          status: 'PENDING_REVIEW',
          student_name: studentName,
        }])
        .select()
        .maybeSingle();

      if (error) throw error;
      const request = mapPaymentRequest(data);
      set({ paymentRequests: [request, ...get().paymentRequests] });
      return request;
    } catch (error) {
      console.error('Error submitting payment request:', error);
      return null;
    }
  },

  approvePaymentRequest: async (requestId) => {
    try {
      const request = get().paymentRequests.find(r => r.id === requestId);
      if (!request) throw new Error('Request not found');

      const adminStore = useAuthStore.getState();
      const adminId = adminStore.currentAdmin?.id;

      // Update payment request status
      const { data, error } = await backend
        .from('payment_requests')
        .update({
          status: 'APPROVED',
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminId,
        })
        .eq('id', requestId)
        .select()
        .maybeSingle();

      if (error) throw error;
      const updatedRequest = mapPaymentRequest(data);

      // Create a successful payment record
      await backend
        .from('payments')
        .insert([{
          student_id: request.studentId,
          razorpay_order_id: `MANUAL_${requestId}`,
          amount: request.amount,
          status: 'SUCCESS',
          proof_url: request.proofUrl,
          transaction_id: request.transactionId,
          paid_at: new Date().toISOString(),
        }]);

      // Update student status to ACTIVE
      await useStudentStore.getState().updateStudent(request.studentId, { status: 'ACTIVE' });

      set({
        paymentRequests: get().paymentRequests.map(r => (r.id === requestId ? updatedRequest : r)),
      });
    } catch (error) {
      console.error('Error approving payment request:', error);
      throw error;
    }
  },

  rejectPaymentRequest: async (requestId, reason) => {
    try {
      const adminStore = useAuthStore.getState();
      const adminId = adminStore.currentAdmin?.id;

      const { data, error } = await backend
        .from('payment_requests')
        .update({
          status: 'REJECTED',
          rejected_reason: reason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminId,
        })
        .eq('id', requestId)
        .select()
        .maybeSingle();

      if (error) throw error;
      const updatedRequest = mapPaymentRequest(data);

      set({
        paymentRequests: get().paymentRequests.map(r => (r.id === requestId ? updatedRequest : r)),
      });
    } catch (error) {
      console.error('Error rejecting payment request:', error);
      throw error;
    }
  },

  getPendingRequests: () => get().paymentRequests.filter(r => r.status === 'PENDING_REVIEW'),
  getByStudent: (studentId) => get().paymentRequests.filter(r => r.studentId === studentId),
}));

// Wallet Store
interface WalletState {
  wallets: Wallet[];
  transactions: WalletTransaction[];
  isLoading: boolean;
  loadWallets: () => Promise<void>;
  loadTransactions: () => Promise<void>;
  getOrCreateWallet: (studentId: string) => Promise<Wallet | null>;
  creditWallet: (studentId: string, amount: number, type: WalletTransaction['type'], reason: string, referenceId?: string) => Promise<void>;
  getWalletByStudent: (studentId: string) => Wallet | undefined;
  getTransactionsByWallet: (walletId: string) => WalletTransaction[];
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallets: [],
  transactions: [],
  isLoading: false,

  loadWallets: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await backend.from('wallets').select('*');
      if (error) throw error;
      set({ wallets: (data || []).map(mapWallet) });
    } catch (error) {
      console.error('Error loading wallets:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadTransactions: async () => {
    try {
      const { data, error } = await backend.from('wallet_transactions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      set({ transactions: (data || []).map(mapWalletTransaction) });
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  },

  getOrCreateWallet: async (studentId) => {
    let wallet = get().wallets.find((w) => w.studentId === studentId);
    if (!wallet) {
      try {
        const { data, error } = await backend
          .from('wallets')
          .insert([{ student_id: studentId, balance: 0 }])
          .select()
          .maybeSingle();

        if (error) throw error;
        wallet = mapWallet(data);
        set({ wallets: [...get().wallets, wallet] });
      } catch (error) {
        console.error('Error creating wallet:', error);
        return null;
      }
    }
    return wallet;
  },

  creditWallet: async (studentId, amount, type, reason, referenceId) => {
    const wallet = await get().getOrCreateWallet(studentId);
    if (!wallet) return;

    try {
      const { error: walletError } = await backend
        .from('wallets')
        .update({ balance: wallet.balance + amount })
        .eq('id', wallet.id);

      if (walletError) throw walletError;

      const { data: transaction, error: transError } = await backend
        .from('wallet_transactions')
        .insert([{
          wallet_id: wallet.id,
          type,
          amount,
          reason,
          reference_id: referenceId,
        }])
        .select()
        .maybeSingle();

      if (transError) throw transError;

      set({
        wallets: get().wallets.map((w) => (w.id === wallet.id ? { ...w, balance: w.balance + amount } : w)),
        transactions: [transaction as WalletTransaction, ...get().transactions],
      });
    } catch (error) {
      console.error('Error crediting wallet:', error);
    }
  },

  getWalletByStudent: (studentId) => get().wallets.find((w) => w.studentId === studentId),
  getTransactionsByWallet: (walletId) => get().transactions.filter((t) => t.walletId === walletId),
}));

// Center Reward Store
interface CenterRewardState {
  rewards: CenterReward[];
  isLoading: boolean;
  loadRewards: () => Promise<void>;
  createReward: (centerOwnerStudentId: string, newStudentId: string, paymentId: string, amount?: number) => Promise<void>;
  getRewardsByOwner: (ownerId: string) => CenterReward[];
}

export const useCenterRewardStore = create<CenterRewardState>((set, get) => ({
  rewards: [],
  isLoading: false,

  loadRewards: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await backend.from('center_rewards').select('*');
      if (error) throw error;
      set({ rewards: data as CenterReward[] });
    } catch (error) {
      console.error('Error loading rewards:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createReward: async (centerOwnerStudentId, newStudentId, paymentId, amount?: number) => {
    const rewardAmount = amount || CENTER_REWARD.amount;
    try {
      console.log('Creating referral reward...', { centerOwnerStudentId, newStudentId });

      // Check for existing reward to prevent duplicates
      const { data: existingReward } = await backend
        .from('center_rewards')
        .select('*')
        .eq('new_student_id', newStudentId)
        .maybeSingle();

      if (existingReward) {
        console.log('Reward already exists for this student:', existingReward);
        return;
      }

      const { data, error } = await backend
        .from('center_rewards')
        .insert([{
          center_owner_student_id: centerOwnerStudentId,
          new_student_id: newStudentId,
          payment_id: paymentId,
          reward_amount: rewardAmount,
          status: 'CREDITED',
        }])
        .select()
        .maybeSingle();

      if (error) {
        console.error('backend center_rewards insert error:', error);
        throw error;
      }

      // Credit the center owner's wallet
      await useWalletStore.getState().creditWallet(
        centerOwnerStudentId,
        rewardAmount,
        'CENTER_REWARD',
        `Referral reward for student registration`,
        newStudentId
      );

      const reward = mapCenterReward(data);
      set({ rewards: [...get().rewards, reward] });
    } catch (error) {
      console.error('Error in createReward store method:', error);
    }
  },

  getRewardsByOwner: (ownerId) => get().rewards.filter((r) => r.centerOwnerStudentId === ownerId),
}));

// Referral Store
interface ReferralState {
  referralCodes: ReferralCode[];
  referralLogs: ReferralLog[];
  centers: Center[];
  isLoading: boolean;
  loadReferralData: () => Promise<void>;
  createReferralCode: (ownerName: string, type: ReferralCodeType, ownerId: string, rewardAmount: number) => Promise<ReferralCode | null>;
  createCenter: (data: Omit<Center, 'id' | 'centerCode' | 'status' | 'totalStudents' | 'totalEarnings' | 'createdAt'>) => Promise<Center | null>;
  approveCenter: (centerId: string, adminId: string) => Promise<void>;
  toggleCodeStatus: (codeId: string) => Promise<void>;
  deleteCenter: (centerId: string) => Promise<void>;
}

export const useReferralStore = create<ReferralState>((set, get) => ({
  referralCodes: [],
  referralLogs: [],
  centers: [],
  isLoading: false,

  loadReferralData: async () => {
    set({ isLoading: true });
    try {
      const safeFetch = async (query: any) => {
        try {
          return await query;
        } catch (e) {
          return { data: [] };
        }
      };

      const [{ data: codes }, { data: logs }, { data: centers }] = await Promise.all([
        safeFetch(backend.from('referral_codes').select('*').order('created_at', { ascending: false })),
        safeFetch(backend.from('referral_logs').select('*').order('created_at', { ascending: false })),
        safeFetch(backend.from('centers').select('*').order('created_at', { ascending: false }))
      ]);

      // Also load locally stored codes (saved when DB insert is blocked by RLS)
      const localCodesRaw = localStorage.getItem('gphdm_referral_codes_local');
      const localCodes: ReferralCode[] = localCodesRaw ? JSON.parse(localCodesRaw) : [];

      // Merge DB codes + local codes (avoid duplicates by code field)
      const dbCodes = (codes?.map(mapReferralCode) as ReferralCode[]) || [];
      const dbCodeSet = new Set(dbCodes.map(c => c.code));
      const mergedCodes = [...dbCodes, ...localCodes.filter(lc => !dbCodeSet.has(lc.code))];

      set({
        referralCodes: mergedCodes,
        referralLogs: (logs?.map(mapReferralLog) as ReferralLog[]) || [],
        centers: (centers?.map(mapCenter) as Center[]) || [],
      });
    } catch (error) {
      console.error('Error loading referral data:', error);
      // On error, still show locally stored codes
      const localCodesRaw = localStorage.getItem('gphdm_referral_codes_local');
      const localCodes: ReferralCode[] = localCodesRaw ? JSON.parse(localCodesRaw) : [];
      set({ referralCodes: localCodes });
    } finally {
      set({ isLoading: false });
    }
  },

  createReferralCode: async (ownerName, type, ownerId, rewardAmount) => {
    const codeStr = type === 'ADMIN_CENTER'
      ? `${REFERRAL_CONFIG.adminCodePrefix}${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      : `${REFERRAL_CONFIG.centerCodePrefix}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Build the new referral code object immediately (works offline/local too)
    const newCode: ReferralCode = {
      id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      code: codeStr,
      type: type as ReferralCode['type'],
      ownerId,
      ownerName,
      rewardAmount,
      isActive: true,
      totalReferrals: 0,
      totalEarnings: 0,
      createdAt: new Date().toISOString(),
    };

    // Try to get valid UUID for DB insert
    let resolvedOwnerId = ownerId;
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ownerId);
    if (!isValidUUID) {
      const { data: sessionData } = await backend.auth.getSession();
      resolvedOwnerId = sessionData?.session?.user?.id || '00000000-0000-0000-0000-000000000001';
    }

    // Try backend insert first
    try {
      const { data, error } = await backend
        .from('referral_codes')
        .insert([{
          code: codeStr,
          type,
          owner_id: resolvedOwnerId,
          owner_name: ownerName,
          reward_amount: rewardAmount,
          is_active: true,
        }])
        .select()
        .maybeSingle();

      if (!error && data) {
        // DB insert succeeded - use DB record
        const dbCode = mapReferralCode(data);
        set({ referralCodes: [dbCode, ...get().referralCodes] });
        return dbCode;
      }
      // If error, fall through to localStorage fallback below
      console.warn('DB insert failed, using localStorage fallback:', error?.message);
    } catch (err: any) {
      console.warn('DB insert error, using localStorage fallback:', err?.message);
    }

    // ✅ FALLBACK: Save to localStorage so the code persists and shows in UI
    const localCodesRaw = localStorage.getItem('gphdm_referral_codes_local');
    const localCodes: ReferralCode[] = localCodesRaw ? JSON.parse(localCodesRaw) : [];
    localCodes.unshift(newCode);
    localStorage.setItem('gphdm_referral_codes_local', JSON.stringify(localCodes));

    // Update state so it shows immediately
    set({ referralCodes: [newCode, ...get().referralCodes] });
    return newCode;
  },

  createCenter: async (data) => {
    try {
      const { data: newCenter, error } = await backend
        .from('centers')
        .insert([{
          name: data.name,
          owner_name: data.ownerName,
          email: data.ownerEmail,
          phone: data.ownerPhone,
          address: data.address,
          state: data.state,
          district: data.district,
          village: data.village,
          block: data.block,
          pincode: data.pincode,
          center_type: data.centerType,
          owner_aadhaar: data.ownerAadhaar,
          id_proof_url: data.idProofUrl,
          address_proof_url: data.addressProofUrl,
          center_photo_url: data.centerPhotoUrl,
          status: 'PENDING',
          center_code: generateCenterCode(),
        }])
        .select()
        .maybeSingle();

      if (error) throw error;
      const center = mapCenter(newCenter);
      set({ centers: [center, ...get().centers] });
      return center;
    } catch (error) {
      console.error('Error creating center:', error);
      return null;
    }
  },

  approveCenter: async (centerId, adminId) => {
    const center = get().centers.find(c => c.id === centerId);
    if (!center) return;

    try {
      // 1. Approve center
      const { error: centerError } = await backend
        .from('centers')
        .update({
          status: 'APPROVED',
          approved_by: adminId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', centerId);

      if (centerError) throw centerError;

      // 2. Create referral code for center
      await get().createReferralCode(
        center.name,
        'CENTER_CODE',
        centerId,
        REFERRAL_CONFIG.centerCodeReward
      );

      // 3. Reload data to ensure everything is synced
      await get().loadReferralData();
    } catch (error) {
      console.error('Error approving center:', error);
    }
  },

  toggleCodeStatus: async (codeId) => {
    const code = get().referralCodes.find(c => c.id === codeId);
    if (!code) return;

    try {
      const { error } = await backend
        .from('referral_codes')
        .update({ is_active: !code.isActive })
        .eq('id', codeId);

      if (error) throw error;

      set({
        referralCodes: get().referralCodes.map(c =>
          c.id === codeId ? { ...c, isActive: !c.isActive } : c
        )
      });
    } catch (error) {
      console.error('Error toggling code status:', error);
    }
  },

  deleteCenter: async (centerId) => {
    try {
      const { error } = await backend.from('centers').delete().eq('id', centerId);
      if (error) throw error;
      set({ centers: get().centers.filter(c => c.id !== centerId) });
    } catch (error) {
      console.error('Error deleting center:', error);
    }
  },
}));

// Exam Store
interface ExamState {
  config: ExamConfigSettings;
  sessions: ExamSession[];
  results: ExamResult[];
  questions: ExamQuestion[];
  isLoading: boolean;
  loadExamData: () => Promise<void>;
  loadQuestions: (classLevel?: number) => Promise<void>;
  updateConfig: (config: Partial<ExamConfigSettings>) => Promise<void>;
  addQuestion: (question: Omit<ExamQuestion, 'id'>) => Promise<void>;
  updateQuestion: (id: string, question: Partial<ExamQuestion>) => Promise<void>;
  deleteQuestion: (id: string) => Promise<void>;
  startExam: (studentId: string, classLevel: number, ipAddress?: string, userAgent?: string) => Promise<ExamSession | null>;
  submitAnswer: (sessionId: string, questionId: string, selectedIndex: number | null, timeTaken: number) => Promise<void>;
  completeExam: (sessionId: string) => Promise<ExamResult | null>;
  getSessionByStudent: (studentId: string) => ExamSession | undefined;
  getResultByStudent: (studentId: string) => ExamResult | undefined;
  getQuestionsForClass: (classLevel: number) => ExamQuestion[];
  hasCompletedExam: (studentId: string) => boolean;
  publishResults: (classLevel: number) => Promise<void>;
}

export const useExamStore = create<ExamState>((set, get) => ({
  config: {
    timePerQuestion: EXAM_CONFIG.defaultTimePerQuestion,
    demoQuestionCount: EXAM_CONFIG.demoQuestionCount,
    gapBetweenQuestions: EXAM_CONFIG.gapBetweenQuestions,
    fees: EXAM_FEES,
    marksPerCorrect: EXAM_CONFIG.marksPerCorrect,
    marksPerWrong: EXAM_CONFIG.marksPerWrong,
    scholarshipAmounts: SCHOLARSHIP_CONFIG.defaultAmounts as Record<number, number>,
  },
  sessions: [],
  results: [],
  questions: [],
  isLoading: false,

  loadQuestions: async (classLevel) => {
    set({ isLoading: true });
    try {
      let query = backend.from('exam_questions').select('*');

      if (classLevel !== undefined) {
        query = query.eq('class_level', classLevel);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        set({ questions: data.map(mapExamQuestion) });
      } else {
        // Fallback to mock data
        const fallbackQuestions = classLevel !== undefined
          ? mockExamQuestions.filter(q => q.class === classLevel)
          : mockExamQuestions;
        set({ questions: fallbackQuestions });
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      const fallbackQuestions = mockExamQuestions.filter(q => q.class === classLevel);
      set({ questions: fallbackQuestions });
    } finally {
      set({ isLoading: false });
    }
  },

  loadExamData: async () => {
    set({ isLoading: true });
    try {
      // Load backend Data - with error handling for missing tables
      let configData = null;
      try {
        const { data } = await backend.from('exam_config').select('*').limit(1);
        configData = data;
      } catch (configError) {
        console.warn('exam_config table might not exist, using default config:', configError);
      }

      let sessionData = [];
      let resultData = [];

      try {
        const { data: sData } = await backend.from('exam_sessions').select('*');
        sessionData = sData || [];
      } catch (sessionError) {
        console.warn('exam_sessions table query failed:', sessionError);
      }

      try {
        const { data: rData } = await backend.from('exam_results').select('*');
        resultData = rData || [];
      } catch (resultError) {
        console.warn('exam_results table query failed:', resultError);
      }

      // Load LocalStorage Data (Mock Data)
      const localResultsStr = localStorage.getItem('exam_results');
      const localResults: ExamResult[] = localResultsStr ? JSON.parse(localResultsStr) : [];

      const localSessionsStr = localStorage.getItem('exam_sessions');
      const localSessions: ExamSession[] = localSessionsStr ? JSON.parse(localSessionsStr) : [];

      set({
        config: configData?.[0] ? {
          timePerQuestion: configData[0].time_per_question,
          demoQuestionCount: configData[0].demo_question_count,
          gapBetweenQuestions: configData[0].gap_between_questions,
          fees: configData[0].fees,
          marksPerCorrect: configData[0].marks_per_correct,
          marksPerWrong: configData[0].marks_per_wrong,
          scholarshipAmounts: configData[0].scholarship_amounts || SCHOLARSHIP_CONFIG.defaultAmounts,
        } : get().config,
        sessions: [...(sessionData.map(mapExamSession)), ...localSessions],
        results: [...(resultData.map(mapExamResult)), ...localResults],
      });
    } catch (error) {
      console.error('Error loading exam data:', error);
      // Fallback to minimal localStorage load if backend fails
      const localResultsStr = localStorage.getItem('exam_results');
      const localResults: ExamResult[] = localResultsStr ? JSON.parse(localResultsStr) : [];
      set({ results: localResults });
    } finally {
      set({ isLoading: false });
    }
  },

  updateConfig: async (newConfig) => {
    try {
      const config = { ...get().config, ...newConfig };
      const dbConfig = {
        time_per_question: config.timePerQuestion,
        demo_question_count: config.demoQuestionCount,
        gap_between_questions: config.gapBetweenQuestions,
        fees: config.fees,
        marks_per_correct: config.marksPerCorrect,
        marks_per_wrong: config.marksPerWrong,
        scholarship_amounts: config.scholarshipAmounts,
      };
      const { error } = await backend.from('exam_config').upsert([dbConfig]);
      if (error) throw error;
      set({ config });
    } catch (error) {
      console.error('Error updating exam config:', error);
    }
  },

  addQuestion: async (question) => {
    try {
      const { data, error } = await backend
        .from('exam_questions')
        .insert([{
          class_level: question.class,
          question_text: question.questionText,
          options: question.options,
          correct_option_index: question.correctOptionIndex,
          subject: question.subject,
          question_file_url: question.questionFileUrl,
        }])
        .select()
        .maybeSingle();

      if (error) throw error;

      const newQuestion = mapExamQuestion(data);
      set({ questions: [...get().questions, newQuestion] });
    } catch (error) {
      console.error('Error adding question:', error);
      throw error;
    }
  },

  updateQuestion: async (id, question) => {
    try {
      const dbUpdate: any = {};
      if (question.class) dbUpdate.class_level = question.class;
      if (question.questionText) dbUpdate.question_text = question.questionText;
      if (question.options) dbUpdate.options = question.options;
      if (question.correctOptionIndex !== undefined) dbUpdate.correct_option_index = question.correctOptionIndex;
      if (question.subject) dbUpdate.subject = question.subject;
      if (question.questionFileUrl !== undefined) dbUpdate.question_file_url = question.questionFileUrl;

      const { data, error } = await backend
        .from('exam_questions')
        .update(dbUpdate)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;

      const updatedQuestion = mapExamQuestion(data);
      set({
        questions: get().questions.map(q => q.id === id ? updatedQuestion : q)
      });
    } catch (error) {
      console.error('Error updating question:', error);
      throw error;
    }
  },

  deleteQuestion: async (id) => {
    try {
      const { error } = await backend
        .from('exam_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set({
        questions: get().questions.filter(q => q.id !== id)
      });
    } catch (error) {
      console.error('Error deleting question:', error);
      throw error;
    }
  },

  startExam: async (studentId, classNum, ipAddress, userAgent) => {
    try {
      // 1. Check if exam already completed
      const { count } = await backend
        .from('exam_results')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId);

      if (count && count > 0) {
        throw new Error('Exam already completed. Multiple attempts are not allowed.');
      }

      // 2. Check if a session is already in progress
      const { data: existingSession } = await backend
        .from('exam_sessions')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'IN_PROGRESS')
        .maybeSingle();

      if (existingSession) {
        const session = mapExamSession(existingSession);
        if (!get().sessions.find(s => s.id === session.id)) {
          set({ sessions: [...get().sessions, session] });
        }
        return session;
      }

      const { data, error } = await backend
        .from('exam_sessions')
        .insert([{
          student_id: studentId,
          class: classNum,
          status: 'IN_PROGRESS',
          current_question_index: 0,
          total_time_spent: 0,
          answers: [],
          ip_address: ipAddress,
          user_agent: userAgent,
        }])
        .select()
        .maybeSingle();

      if (error) throw error;
      const session = mapExamSession(data);
      set({ sessions: [...get().sessions, session] });
      return session;
    } catch (error) {
      console.error('Error starting exam:', error);
      return null;
    }
  },

  submitAnswer: async (sessionId, questionId, selectedIndex, timeTaken) => {
    const session = get().sessions.find(s => s.id === sessionId);
    if (!session) return;

    const newAnswer = {
      questionId,
      selectedOptionIndex: selectedIndex,
      timeTaken,
      answeredAt: new Date().toISOString(),
    };

    const updatedAnswers = [...session.answers, newAnswer];
    const nextIndex = session.currentQuestionIndex + 1;
    const nextTime = session.totalTimeSpent + timeTaken;

    try {
      const { error } = await backend
        .from('exam_sessions')
        .update({
          answers: updatedAnswers,
          current_question_index: nextIndex,
          total_time_spent: nextTime,
        })
        .eq('id', sessionId);

      if (error) throw error;

      set({
        sessions: get().sessions.map((s) =>
          s.id === sessionId
            ? { ...s, answers: updatedAnswers, currentQuestionIndex: nextIndex, totalTimeSpent: nextTime }
            : s
        ),
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  },

  completeExam: async (sessionId) => {
    const session = get().sessions.find((s) => s.id === sessionId);
    if (!session) return null;

    const questions = get().questions.length > 0
      ? get().questions
      : mockExamQuestions.filter((q) => q.class === session.class);

    const questionCount = Math.min(get().config.demoQuestionCount, questions.length);
    const relevantQuestions = questions.slice(0, questionCount);

    let correctCount = 0;
    let wrongCount = 0;

    session.answers.forEach((answer) => {
      const question = relevantQuestions.find((q) => q.id === answer.questionId);
      if (question) {
        if (answer.selectedOptionIndex === question.correctOptionIndex) {
          correctCount++;
        } else if (answer.selectedOptionIndex !== null) {
          wrongCount++;
        }
      }
    });

    const unansweredCount = questionCount - correctCount - wrongCount;
    const totalScore = correctCount * get().config.marksPerCorrect + wrongCount * get().config.marksPerWrong;

    try {
      const { data: resultData, error: resultError } = await backend
        .from('exam_results')
        .insert([{
          student_id: session.studentId,
          class: session.class,
          total_score: totalScore,
          correct_count: correctCount,
          wrong_count: wrongCount,
          unanswered_count: unansweredCount,
          total_time_taken: session.totalTimeSpent,
          result_status: 'PENDING',
        }])
        .select()
        .maybeSingle();

      if (resultError) throw resultError;

      const { error: sessionError } = await backend
        .from('exam_sessions')
        .update({ status: 'COMPLETED' })
        .eq('id', sessionId);

      if (sessionError) throw sessionError;

      const result = mapExamResult(resultData);
      set({
        sessions: get().sessions.map((s) => (s.id === sessionId ? { ...s, status: 'COMPLETED' } : s)),
        results: [...get().results, result],
      });

      // Automatically generate participation certificate
      try {
        const certificateStore = useCertificateStore.getState();
        await certificateStore.generateCertificate(
          session.studentId,
          result.id,
          'PARTICIPATION'
        );
        console.log('Certificate generated automatically for student:', session.studentId);
      } catch (certError) {
        console.error('Failed to auto-generate certificate:', certError);
        // Don't fail the exam completion if certificate generation fails
      }

      return result;
    } catch (error) {
      console.error('Error completing exam:', error);
      return null;
    }
  },

  getSessionByStudent: (studentId) => get().sessions.find((s) => s.studentId === studentId),
  getResultByStudent: (studentId) => get().results.find((r) => r.studentId === studentId),
  getQuestionsForClass: (classNum) => {
    const dbQuestions = get().questions.filter(q => q.class === classNum);
    return dbQuestions.length > 0 ? dbQuestions : mockExamQuestions.filter((q) => q.class === classNum);
  },
  hasCompletedExam: (studentId) => get().results.some((r) => r.studentId === studentId),

  publishResults: async (classLevel) => {
    // Rank results
    const classResults = get().results
      .filter((r) => r.class === classLevel)
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
        return a.totalTimeTaken - b.totalTimeTaken;
      });

    try {
      const promises = classResults.map((r, index) => {
        const rank = index + 1;
        return backend
          .from('exam_results')
          .update({ rank, result_status: 'PUBLISHED' })
          .eq('id', r.id);
      });

      await Promise.all(promises);

      set({
        results: get().results.map((r) => {
          if (r.class === classLevel) {
            const rank = classResults.findIndex((cr) => cr.id === r.id) + 1;
            return { ...r, rank, resultStatus: 'PUBLISHED' };
          }
          return r;
        }),
      });
    } catch (error) {
      console.error('Error publishing results:', error);
    }
  },
}));

// Scholarship Store
interface ScholarshipState {
  scholarships: Scholarship[];
  isLoading: boolean;
  loadScholarships: () => Promise<void>;
  createScholarship: (studentId: string, classLevel: number, rank: number) => Promise<Scholarship | null>;
  approveScholarship: (id: string, adminId: string, type: Scholarship['scholarshipType'], amount?: number) => Promise<void>;
  rejectScholarship: (id: string, adminId: string, reason: string) => Promise<void>;
  getScholarshipByStudent: (studentId: string) => Scholarship | undefined;
}

export const useScholarshipStore = create<ScholarshipState>((set, get) => ({
  scholarships: [],
  isLoading: false,

  loadScholarships: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await backend.from('scholarships').select('*');
      if (error) throw error;
      set({ scholarships: (data || []).map(mapScholarship) });
    } catch (error) {
      console.error('Error loading scholarships:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createScholarship: async (studentId, classLevel, rank) => {
    try {
      const { data, error } = await backend
        .from('scholarships')
        .insert([{
          student_id: studentId,
          class: classLevel,
          rank,
          scholarship_type: 'CERTIFICATE',
          approval_status: 'PENDING',
        }])
        .select()
        .maybeSingle();

      if (error) throw error;
      const scholarship = mapScholarship(data);
      set({ scholarships: [...get().scholarships, scholarship] });
      return scholarship;
    } catch (error) {
      console.error('Error creating scholarship:', error);
      return null;
    }
  },

  approveScholarship: async (id, adminId, type, amount) => {
    try {
      const { error } = await backend
        .from('scholarships')
        .update({
          scholarship_type: type,
          amount,
          approval_status: 'APPROVED',
          approved_by: adminId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      set({
        scholarships: get().scholarships.map((s) =>
          s.id === id
            ? {
              ...s,
              scholarshipType: type,
              amount,
              approvalStatus: 'APPROVED',
              approvedBy: adminId,
              approvedAt: new Date().toISOString(),
            }
            : s
        ),
      });

      // Credit wallet if amount
      const scholarship = get().scholarships.find((s) => s.id === id);
      if (scholarship && amount) {
        await useWalletStore.getState().creditWallet(
          scholarship.studentId,
          amount,
          'SCHOLARSHIP_CREDIT',
          `Scholarship award - Rank ${scholarship.rank}`,
          id
        );
      }
    } catch (error) {
      console.error('Error approving scholarship:', error);
    }
  },

  rejectScholarship: async (id, adminId, reason) => {
    try {
      const { error } = await backend
        .from('scholarships')
        .update({
          approval_status: 'REJECTED',
          approved_by: adminId,
          approved_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', id);

      if (error) throw error;

      set({
        scholarships: get().scholarships.map((s) =>
          s.id === id
            ? {
              ...s,
              approvalStatus: 'REJECTED',
              approvedBy: adminId,
              approvedAt: new Date().toISOString(),
              rejectionReason: reason,
            }
            : s
        ),
      });
    } catch (error) {
      console.error('Error rejecting scholarship:', error);
    }
  },

  getScholarshipByStudent: (studentId) => get().scholarships.find((s) => s.studentId === studentId),
}));

// Certificate Store
interface CertificateState {
  certificates: Certificate[];
  settings: CertificateSettings;
  isLoading: boolean;
  loadCertificates: () => Promise<void>;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: CertificateSettings) => Promise<void>;
  updateTemplateConfig: (template: CertificateTemplate, config: Partial<CertificateTemplateConfig>) => Promise<void>;
  setDefaultTemplate: (template: CertificateTemplate) => Promise<void>;
  generateCertificate: (studentId: string, examResultId: string, type: Certificate['certificateType']) => Promise<Certificate | null>;
  getCertificateByStudent: (studentId: string) => Certificate | undefined;
  getCertificateById: (certificateId: string) => Certificate | undefined;
  verifyCertificate: (certificateId: string) => Promise<{ isValid: boolean; certificate?: Certificate; student?: Student }>;
}

export const useCertificateStore = create<CertificateState>((set, get) => ({
  certificates: [],
  settings: DEFAULT_CERTIFICATE_SETTINGS,
  isLoading: false,

  loadCertificates: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await backend.from('certificates').select('*');
      if (error) throw error;

      const mappedCertificates = (data || []).map((c: any) => ({
        ...c,
        id: c.id,
        studentId: c.student_id || c.studentId,
        examResultId: c.exam_result_id || c.examResultId,
        certificateId: c.certificate_id || c.certificateId,
        certificateType: c.certificate_type || c.certificateType,
        issuedAt: c.issued_at || c.issuedAt || c.created_at,
        isValid: c.is_valid !== undefined ? c.is_valid : c.isValid,
        qrCode: c.qr_code || c.qrCode,
      })) as Certificate[];

      set({ certificates: mappedCertificates });
    } catch (error) {
      console.error('Error loading certificates:', error);
      // Fallback to empty
      set({ certificates: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  loadSettings: async () => {
    try {
      const { data, error } = await backend.from('certificate_settings').select('*').limit(1);
      if (error) throw error;
      if (data?.[0]) {
        const row = data[0];
        set({
          settings: {
            defaultTemplate: (row.default_template as CertificateTemplate) || DEFAULT_CERTIFICATE_SETTINGS.defaultTemplate,
            templates: {
              classic: { ...DEFAULT_CERTIFICATE_SETTINGS.templates.classic, ...(row.classic_config || {}) },
              modern: { ...DEFAULT_CERTIFICATE_SETTINGS.templates.modern, ...(row.modern_config || {}) },
              prestigious: { ...DEFAULT_CERTIFICATE_SETTINGS.templates.prestigious, ...(row.prestigious_config || {}) },
              gphdm: { ...DEFAULT_CERTIFICATE_SETTINGS.templates.gphdm, ...(row.gphdm_config || {}) },
            }
          }
        });
      }
    } catch (error) {
      console.error('Error loading certificate settings:', error);
    }
  },

  updateSettings: async (settings) => {
    try {
      set({ settings }); // Setup optimist update
      const { data: existingData } = await backend.from('certificate_settings').select('id').limit(1);

      const payload: any = {
        default_template: settings.defaultTemplate,
        classic_config: settings.templates.classic,
        modern_config: settings.templates.modern,
        prestigious_config: settings.templates.prestigious,
        gphdm_config: settings.templates.gphdm,
        updated_at: new Date().toISOString()
      };

      let error;
      if (existingData && existingData.length > 0) {
        const { error: updateError } = await backend
          .from('certificate_settings')
          .update(payload)
          .eq('id', existingData[0].id);
        error = updateError;
      } else {
        const { error: insertError } = await backend
          .from('certificate_settings')
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;
    } catch (error) {
      console.error('Error updating certificate settings:', error);
    }
  },

  updateTemplateConfig: async (template, config) => {
    const currentSettings = get().settings;
    const templateKey = template.toLowerCase() as 'classic' | 'modern' | 'prestigious' | 'gphdm';
    const updatedSettings = {
      ...currentSettings,
      templates: {
        ...currentSettings.templates,
        [templateKey]: {
          ...currentSettings.templates[templateKey],
          ...config,
        },
      },
    };
    await get().updateSettings(updatedSettings);
  },

  setDefaultTemplate: async (template) => {
    const currentSettings = get().settings;
    const updatedSettings = {
      ...currentSettings,
      defaultTemplate: template,
    };
    await get().updateSettings(updatedSettings);
  },

  generateCertificate: async (studentId, examResultId, type) => {
    const certId = generateCertificateId();
    try {
      const { data, error } = await backend
        .from('certificates')
        .insert([{
          student_id: studentId,
          exam_result_id: examResultId,
          certificate_id: certId,
          certificate_type: type,
          qr_code: `https://nsep.edu.in/verify/${certId}`,
          is_valid: true,
        }])
        .select()
        .maybeSingle();

      if (error) throw error;
      const certificate = data as Certificate;
      set({ certificates: [...get().certificates, certificate] });

      // Send certificate issued email
      const { data: student } = await backend.from('students').select('*').eq('id', studentId).maybeSingle();
      const { data: result } = await backend.from('exam_results').select('*').eq('id', examResultId).maybeSingle();

      if (student && result) {
        sendEmailNotification('CERTIFICATE_ISSUED', student.email, {
          studentName: student.name,
          studentEmail: student.email,
          certificateId: certId,
          certificateType: type,
          class: student.class,
          rank: result.rank || 0,
          date: new Date().toISOString(),
        });
      }

      return certificate;
    } catch (error) {
      console.error('Error generating certificate:', error);
      return null;
    }
  },

  getCertificateByStudent: (studentId) => get().certificates.find((c) => c.studentId === studentId),
  getCertificateById: (certificateId) => get().certificates.find((c) => c.certificateId === certificateId),

  verifyCertificate: async (term) => {
    try {
      // Try finding by Certificate ID first
      let { data: certData, error } = await backend
        .from('certificates')
        .select('*')
        .eq('certificate_id', term)
        .maybeSingle();

      // If not found, try searching by Student ID
      if (!certData) {
        const { data: certByStudent } = await backend
          .from('certificates')
          .select('*')
          .eq('student_id', term)
          .maybeSingle();

        if (certByStudent) {
          certData = certByStudent;
        }
      }

      if (!certData || (certData.is_valid === false)) {
        return { isValid: false };
      }

      const certificate: Certificate = {
        ...certData,
        id: certData.id,
        studentId: certData.student_id || certData.studentId,
        examResultId: certData.exam_result_id || certData.examResultId,
        certificateId: certData.certificate_id || certData.certificateId,
        certificateType: certData.certificate_type || certData.certificateType,
        issuedAt: certData.issued_at || certData.issuedAt || certData.created_at,
        isValid: certData.is_valid !== undefined ? certData.is_valid : certData.isValid,
        qrCode: certData.qr_code || certData.qrCode,
      };

      // Fetch student details
      const { data: studentData } = await backend
        .from('students')
        .select('*')
        .eq('id', certificate.studentId)
        .maybeSingle();

      if (!studentData) {
        return { isValid: false };
      }

      const student: Student = {
        ...studentData,
        fatherName: studentData.father_name || studentData.fatherName,
        centerCode: studentData.center_code || studentData.centerCode,
        schoolName: studentData.school_name || studentData.schoolName,
        addressVillage: studentData.address_village || studentData.addressVillage,
        // Add other mappings as needed, assuming most match or aren't displayed in verify
      } as Student;

      return {
        isValid: true,
        certificate,
        student,
      };
    } catch (error) {
      console.error('Error verifying certificate:', error);
      return { isValid: false };
    }
  },

}));

// Admin Log Store
interface AdminLogState {
  logs: AdminLog[];
  loadLogs: () => void;
  addLog: (adminId: string, action: string, referenceId?: string, details?: string) => Promise<void>;
}

export const useAdminLogStore = create<AdminLogState>((set, get) => ({
  logs: [],

  loadLogs: () => {
    const logs = getStoredData<AdminLog[]>(STORAGE_KEYS.adminLogs, []);
    set({ logs });
  },

  addLog: async (adminId, action, referenceId, details) => {
    try {
      const { data, error } = await backend
        .from('admin_logs')
        .insert([{
          admin_id: adminId,
          action,
          reference_id: referenceId,
          details,
        }])
        .select()
        .maybeSingle();

      if (error) throw error;

      const log: AdminLog = {
        id: data.id,
        adminId: data.admin_id,
        action: data.action,
        referenceId: data.reference_id,
        details: data.details,
        createdAt: data.created_at,
      };

      set({ logs: [log, ...get().logs] });
    } catch (error) {
      console.error('Error adding admin log:', error);
    }
  },
}));

// Email Store
interface EmailState {
  templates: EmailTemplate[];
  deliveries: EmailDelivery[];
  isLoading: boolean;
  loadEmailData: () => Promise<void>;
  createTemplate: (name: string, subject: string, bodyHtml: string) => Promise<EmailTemplate | null>;
  updateTemplate: (id: string, data: Partial<EmailTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  setDefaultTemplate: (id: string) => Promise<void>;
  sendEmail: (studentId: string, certificateId: string, templateId: string) => Promise<EmailDelivery | null>;
  sendBulkEmails: (studentIds: string[], templateId: string) => Promise<void>;
  resendEmail: (deliveryId: string) => Promise<void>;
  getDeliveriesByStudent: (studentId: string) => EmailDelivery[];
}

export const useEmailStore = create<EmailState>((set, get) => ({
  templates: [],
  deliveries: [],
  isLoading: false,

  loadEmailData: async () => {
    set({ isLoading: true });
    try {
      const { data: templates } = await backend.from('email_templates').select('*');
      const { data: deliveries } = await backend.from('email_deliveries').select('*');

      set({
        templates: (templates as EmailTemplate[]) || [],
        deliveries: (deliveries as EmailDelivery[]) || [],
      });
    } catch (error) {
      console.error('Error loading email data:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createTemplate: async (name, subject, bodyHtml) => {
    const variables = extractVariables(bodyHtml);
    try {
      const { data, error } = await backend
        .from('email_templates')
        .insert([{
          name,
          subject,
          body_html: bodyHtml,
          variables,
          is_default: false,
        }])
        .select()
        .maybeSingle();

      if (error) throw error;
      const template = data as EmailTemplate;
      set({ templates: [...get().templates, template] });
      return template;
    } catch (error) {
      console.error('Error creating template:', error);
      return null;
    }
  },

  updateTemplate: async (id, data) => {
    try {
      const updateData = { ...data };
      if (data.bodyHtml) {
        updateData.variables = extractVariables(data.bodyHtml);
      }
      const { error } = await backend.from('email_templates').update(updateData).eq('id', id);
      if (error) throw error;
      set({
        templates: get().templates.map((t) => (t.id === id ? { ...t, ...updateData } : t)),
      });
    } catch (error) {
      console.error('Error updating template:', error);
    }
  },

  deleteTemplate: async (id) => {
    try {
      const { error } = await backend.from('email_templates').delete().eq('id', id);
      if (error) throw error;
      set({ templates: get().templates.filter((t) => t.id !== id) });
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  },

  setDefaultTemplate: async (id) => {
    try {
      // Set all to false, then one to true
      await backend.from('email_templates').update({ is_default: false }).neq('id', id);
      await backend.from('email_templates').update({ is_default: true }).eq('id', id);
      set({
        templates: get().templates.map((t) => ({ ...t, isDefault: t.id === id })),
      });
    } catch (error) {
      console.error('Error setting default template:', error);
    }
  },

  sendEmail: async (studentId, certificateId, templateId) => {
    const student = await useStudentStore.getState().getStudentById(studentId);
    const template = get().templates.find((t) => t.id === templateId);

    if (!student || !template) return null;

    // Simulate sending
    const success = Math.random() > 0.1;
    const status: EmailDelivery['status'] = success ? 'SENT' : 'FAILED';

    try {
      const { data, error } = await backend
        .from('email_deliveries')
        .insert([{
          student_id: studentId,
          certificate_id: certificateId,
          template_id: templateId,
          recipient_email: student.email,
          subject: template.subject,
          status,
          sent_at: success ? new Date().toISOString() : null,
          error_message: !success ? 'Simulated delivery failure' : null,
        }])
        .select()
        .maybeSingle();

      if (error) throw error;
      const delivery = data as EmailDelivery;
      set({ deliveries: [...get().deliveries, delivery] });
      return delivery;
    } catch (error) {
      console.error('Error sending email:', error);
      return null;
    }
  },

  sendBulkEmails: async (studentIds, templateId) => {
    const promises = studentIds.map((sid) => {
      const cert = useCertificateStore.getState().getCertificateByStudent(sid);
      if (cert) return get().sendEmail(sid, cert.certificateId, templateId);
      return Promise.resolve(null);
    });
    await Promise.all(promises);
  },

  resendEmail: async (deliveryId) => {
    const delivery = get().deliveries.find((d) => d.id === deliveryId);
    if (!delivery) return;

    const success = Math.random() > 0.2;
    const status: EmailDelivery['status'] = success ? 'SENT' : 'RETRY';

    try {
      const { error } = await backend
        .from('email_deliveries')
        .update({
          status,
          sent_at: success ? new Date().toISOString() : delivery.sentAt,
          retry_count: delivery.retryCount + 1,
          last_retry_at: new Date().toISOString(),
        })
        .eq('id', deliveryId);

      if (error) throw error;
      await get().loadEmailData();
    } catch (error) {
      console.error('Error resending email:', error);
    }
  },

  getDeliveriesByStudent: (studentId) => get().deliveries.filter((d) => d.studentId === studentId),
}));

// Helper function to extract template variables
function extractVariables(text: string): string[] {
  const regex = /{{(\w+)}}/g;
  const matches = text.matchAll(regex);
  const variables = new Set<string>();
  for (const match of matches) {
    variables.add(match[1]);
  }
  return Array.from(variables);
}
// Admin Store
interface AdminState {
  stats: DashboardStats | null;
  classStats: ClassStats[];
  isLoading: boolean;
  fetchDashboardStats: () => Promise<void>;
  fetchClassWiseStats: () => Promise<void>;
}

export const useAdminStore = create<AdminState>((set) => ({
  stats: null,
  classStats: [],
  isLoading: false,

  fetchDashboardStats: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await backend.rpc('get_admin_dashboard_stats');
      if (error) throw error;
      set({ stats: data as DashboardStats });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchClassWiseStats: async () => {
    try {
      const { data, error } = await backend.rpc('get_class_wise_stats');
      if (error) throw error;
      set({ classStats: data as ClassStats[] });
    } catch (error) {
      console.error('Error fetching class stats:', error);
    }
  },
}));
// Gallery Store
interface GalleryState {
  items: GalleryItem[];
  isLoading: boolean;
  fetchGallery: () => Promise<void>;
  addItem: (item: Omit<GalleryItem, 'id' | 'createdAt'>) => Promise<void>;
  updateItem: (id: string, item: Partial<GalleryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const useGalleryStore = create<GalleryState>((set, get) => ({
  items: [],
  isLoading: false,

  fetchGallery: async () => {
    set({ isLoading: true });
    try {
      // Always load from localStorage first (works offline, no RLS needed)
      const localRaw = localStorage.getItem('gphdm_gallery_items');
      const localItems: GalleryItem[] = localRaw ? JSON.parse(localRaw) : [];

      // Try to also load from DB and merge (DB items take priority by id)
      try {
        const { data, error } = await backend
          .from('gallery_items')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const dbItems = data.map(item => ({
            id: item.id,
            title: item.title,
            description: item.description,
            imageUrl: item.image_url,
            category: item.category as any,
            year: item.year,
            featured: item.featured || false,
            isPublished: item.is_published,
            createdAt: item.created_at,
          })) as GalleryItem[];

          // Merge: local items that aren't in DB + all DB items
          const dbIds = new Set(dbItems.map(i => i.id));
          const merged = [...dbItems, ...localItems.filter(i => !dbIds.has(i.id))];
          set({ items: merged });
          return;
        }
      } catch {
        // DB unavailable - use local only
      }

      set({ items: localItems });
    } catch (error) {
      console.error('Error fetching gallery:', error);
      set({ items: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (item) => {
    // Resolve image: if imageUrl is a local: reference, get actual base64
    let resolvedImageUrl = item.imageUrl;
    if (resolvedImageUrl?.startsWith('local:')) {
      resolvedImageUrl = localStorage.getItem(resolvedImageUrl.slice(6)) || resolvedImageUrl;
    }

    const newItem: GalleryItem = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: item.title,
      description: item.description || '',
      imageUrl: resolvedImageUrl,
      category: item.category as any,
      year: item.year || new Date().getFullYear(),
      featured: item.featured || false,
      isPublished: item.isPublished !== false,
      createdAt: new Date().toISOString(),
    };

    // Save to localStorage immediately
    const localRaw = localStorage.getItem('gphdm_gallery_items');
    const localItems: GalleryItem[] = localRaw ? JSON.parse(localRaw) : [];
    localItems.unshift(newItem);
    localStorage.setItem('gphdm_gallery_items', JSON.stringify(localItems));
    set({ items: [newItem, ...get().items] });

    // Try saving to DB in background (won't block UI)
    try {
      await backend.from('gallery_items').insert([{
        title: item.title,
        description: item.description,
        image_url: resolvedImageUrl,
        category: item.category,
        is_published: item.isPublished,
        year: item.year,
        featured: item.featured
      }]);
    } catch {
      // DB save failed - localStorage already has it, so it's fine
    }
  },

  updateItem: async (id, item) => {
    // Update in localStorage
    const localRaw = localStorage.getItem('gphdm_gallery_items');
    const localItems: GalleryItem[] = localRaw ? JSON.parse(localRaw) : [];
    const updatedLocal = localItems.map(i => i.id === id ? { ...i, ...item } : i);
    localStorage.setItem('gphdm_gallery_items', JSON.stringify(updatedLocal));
    set({ items: get().items.map(i => i.id === id ? { ...i, ...item } : i) });

    // Try DB update
    try {
      const updateData: any = {};
      if (item.title) updateData.title = item.title;
      if (item.description !== undefined) updateData.description = item.description;
      if (item.imageUrl) updateData.image_url = item.imageUrl;
      if (item.category) updateData.category = item.category;
      if (item.isPublished !== undefined) updateData.is_published = item.isPublished;
      if (item.year !== undefined) updateData.year = item.year;
      if (item.featured !== undefined) updateData.featured = item.featured;
      await backend.from('gallery_items').update(updateData).eq('id', id);
    } catch {
      // DB update failed - localStorage updated
    }
  },

  deleteItem: async (id) => {
    // Remove from localStorage
    const localRaw = localStorage.getItem('gphdm_gallery_items');
    const localItems: GalleryItem[] = localRaw ? JSON.parse(localRaw) : [];
    localStorage.setItem('gphdm_gallery_items', JSON.stringify(localItems.filter(i => i.id !== id)));
    set({ items: get().items.filter(i => i.id !== id) });

    // Try DB delete
    try {
      await backend.from('gallery_items').delete().eq('id', id);
    } catch {
      // DB delete failed - localStorage updated
    }
  }
}));

// 12. Syllabus Store
interface SyllabusState {
  syllabuses: Syllabus[];
  isLoading: boolean;
  fetchSyllabuses: (classLevel?: number) => Promise<void>;
  saveSyllabus: (classLevel: number, subject: string, topics: SyllabusTopic[]) => Promise<void>;
  toggleStatus: (id: string, isActive: boolean) => Promise<void>;
}

export const useSyllabusStore = create<SyllabusState>((set, get) => ({
  syllabuses: [],
  isLoading: false,
  fetchSyllabuses: async (classLevel) => {
    set({ isLoading: true });
    try {
      const data = await SyllabusService.getSyllabuses(classLevel);
      set({ syllabuses: data });
    } finally {
      set({ isLoading: false });
    }
  },
  saveSyllabus: async (classLevel, subject, topics) => {
    await SyllabusService.saveSyllabus(classLevel, subject, topics);
    get().fetchSyllabuses();
  },
  toggleStatus: async (id, isActive) => {
    await SyllabusService.toggleSyllabusStatus(id, isActive);
    get().fetchSyllabuses();
  }
}));

// 13. Automation & AI Scheduler Store
interface AutomationState {
  schedules: ExamSchedule[];
  aiReports: AIGenerationReport[];
  notifLogs: NotificationDispatchLog[];
  isLoading: boolean;
  fetchAutomationData: () => Promise<void>;
  runAutomationRunner: () => Promise<void>;
  generateQuestions: (classLevel: number, count?: number) => Promise<void>;
}

export const useAutomationStore = create<AutomationState>((set, get) => ({
  schedules: [],
  aiReports: [],
  notifLogs: [],
  isLoading: false,

  fetchAutomationData: async () => {
    set({ isLoading: true });
    try {
      const [{ data: schedules }, { data: aiReports }, { data: notifLogs }] = await Promise.all([
        backend.from('exam_schedules').select('*').order('exam_date', { ascending: true }),
        backend.from('ai_generation_reports').select('*').order('created_at', { ascending: false }),
        backend.from('notification_dispatch_logs').select('*').order('sent_at', { ascending: false }).limit(100)
      ]);

      set({
        schedules: schedules || [],
        aiReports: aiReports || [],
        notifLogs: notifLogs || []
      });
    } finally {
      set({ isLoading: false });
    }
  },

  runAutomationRunner: async () => {
    await ExamSchedulerService.runAutomatedWorkflow();
    get().fetchAutomationData();
  },

  generateQuestions: async (classLevel, count) => {
    await AIExamService.generateQuestionsFromSyllabus(classLevel, count);
    get().fetchAutomationData();
  }
}));

