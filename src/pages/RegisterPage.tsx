import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, FileText, Shield, Users, Gift, Loader2, Copy, Share2, Camera, Upload, X, User, QrCode, Image as ImageIcon, Clock, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useStudentStore, useAuthStore, useReferralStore, usePaymentStore, useCenterRewardStore } from '@/stores';
import { CLASSES, INDIAN_STATES, getExamFee, APP_CONFIG, POLICY_CONFIG, REFERRAL_CONFIG, RAZORPAY_CONFIG } from '@/constants/config';
import { isValidEmail, isValidMobile, formatCurrency, generateId, generateCenterCode, compressImage } from '@/lib/utils';
import { STATE_DISTRICTS } from '@/constants/districts';
import { client as backend } from '@/lib/backend';
import { useLanguage } from '@/contexts/LanguageContext';
import { PaymentQRCode } from '@/components/ui/PaymentQRCode';
import { loadRazorpayScript } from '@/constants/razorpay';

// MASTER_REFERRAL_CODE moved to config.ts as APP_CONFIG.masterReferralCode

type Step = 'identity' | 'payment' | 'address' | 'consent' | 'review' | 'success';

interface FormData {
  name: string;
  fatherName: string;
  class: number;
  mobile: string;
  email: string;
  schoolName: string;
  schoolContact: string;
  addressVillage: string;
  addressBlock: string;
  addressTahsil: string;
  addressDistrict: string;
  addressState: string;
  referredByCenter: string;
  password?: string;
  photoUrl: string;
}

interface ConsentData {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  referralPolicyAccepted: boolean;
}

const initialFormData: FormData = {
  name: '',
  fatherName: '',
  class: 0,
  mobile: '',
  email: '',
  schoolName: '',
  schoolContact: '',
  addressVillage: '',
  addressBlock: '',
  addressTahsil: '',
  addressDistrict: '',
  addressState: '',
  referredByCenter: '',
  password: '',
  photoUrl: '',
};

// Maximum file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Allowed image types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const initialConsentData: ConsentData = {
  termsAccepted: false,
  privacyAccepted: false,
  referralPolicyAccepted: false,
};

// Get user's IP (simulated - in real app would use backend)
const getUserIP = (): string => {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
};

export function RegisterPage() {
  const [step, setStep] = useState<Step>('identity');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [consentData, setConsentData] = useState<ConsentData>(initialConsentData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [consentError, setConsentError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referralInfo, setReferralInfo] = useState<{ type: string; ownerName: string } | null>(null);
  const [referralType, setReferralType] = useState<'CENTER' | 'STUDENT' | null>(null);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [registeredStudent, setRegisteredStudent] = useState<any>(null);
  const [searchParams] = useSearchParams();
  const [showReferralGate, setShowReferralGate] = useState(false);
  const [manualTransactionId, setManualTransactionId] = useState('');
  const [manualProofUrl, setManualProofUrl] = useState('');
  const [paymentConfirmationChecked, setPaymentConfirmationChecked] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [submittedApplicationId, setSubmittedApplicationId] = useState('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'manual' | 'online'>('manual');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const proofInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const { loadStudents, addStudent, getStudentByEmail, getStudentByMobile } = useStudentStore();
  const { loginStudent, currentStudent } = useAuthStore();
  const { referralCodes, loadReferralData } = useReferralStore();
  const { createPayment, verifyPayment } = usePaymentStore();
  const { createReward } = useCenterRewardStore();

  useEffect(() => {
    loadStudents();
    loadReferralData();
  }, [loadStudents, loadReferralData]);

  // Resume Incomplete Registration
  useEffect(() => {
    if (currentStudent && currentStudent.status === 'PENDING') {
      setPendingStudentId(currentStudent.id);

      // Populate form data from existing student record
      setFormData({
        name: currentStudent.name || '',
        fatherName: currentStudent.fatherName === 'TBD' ? '' : (currentStudent.fatherName || ''),
        class: currentStudent.class || 0,
        mobile: currentStudent.mobile || '',
        email: currentStudent.email || '',
        schoolName: currentStudent.schoolName === 'TBD' ? '' : (currentStudent.schoolName || ''),
        schoolContact: currentStudent.schoolContact === 'TBD' ? '' : (currentStudent.schoolContact || ''),
        addressVillage: currentStudent.addressVillage === 'TBD' ? '' : (currentStudent.addressVillage || ''),
        addressBlock: currentStudent.addressBlock === 'TBD' ? '' : (currentStudent.addressBlock || ''),
        addressTahsil: currentStudent.addressTahsil === 'TBD' ? '' : (currentStudent.addressTahsil || ''),
        addressDistrict: currentStudent.addressDistrict === 'TBD' ? '' : (currentStudent.addressDistrict || ''),
        addressState: currentStudent.addressState || INDIAN_STATES[0],
        referredByCenter: currentStudent.referredByCenter || currentStudent.referredByStudent || '',
        password: '', // Password cannot be retrieved
        photoUrl: currentStudent.photoUrl || '',
      });

      // If already paid, move to address step
      const paid = usePaymentStore.getState().hasSuccessfulPayment(currentStudent.id);
      if (paid) {
        setPaymentVerified(true);
        setStep('address');
      } else {
        setStep('payment');
      }

      // Also validate referral code if it exists
      const refCode = currentStudent.referredByCenter || currentStudent.referredByStudent;
      if (refCode) {
        validateReferralCode(refCode);
      }
    }
  }, [currentStudent]);

  // Removed auto-trigger for payment to avoid popup blockers

  // Handle referral code from URL
  useEffect(() => {
    const refCode = searchParams.get('ref');

    // If no ref code and not resuming a pending registration, show the gate
    if (!refCode && !currentStudent) {
      setShowReferralGate(true);
      return;
    }

    setShowReferralGate(false);

    if (refCode) {
      const code = refCode.toUpperCase().trim();
      updateField('referredByCenter', code);
      // Validate the referral code
      validateReferralCode(code);
    }
  }, [searchParams, currentStudent]);

  // Validate referral code
  const validateReferralCode = async (code: string) => {
    if (!code.trim()) return;

    const normalizedCode = code.trim().toUpperCase();

    // Check Master Code
    if (normalizedCode === APP_CONFIG.masterReferralCode) {
      setReferralInfo({
        type: 'Master Referral',
        ownerName: 'NSEP Organization',
      });
      setReferralType('CENTER');
      return;
    }

    // Check if it's a student referral code (STU prefix)
    if (normalizedCode.startsWith('STU') && normalizedCode.length >= 8) {
      // Due to backend RLS policies, unauthenticated users cannot read `students` table
      // to fetch the referrer's name. We'll accept valid-looking STU codes here.
      // The backend/payment processor will securely handle the actual reward mapping.
      setReferralInfo({
        type: 'Student Referral',
        ownerName: 'Fellow Student',
      });
      setReferralType('STUDENT');
      return;
    }

    // Check if it's an Admin Center Code (ADM prefix) or Center Code (CC prefix)
    const referralCode = referralCodes.find((r: any) => r.code === code && r.isActive);

    if (referralCode) {
      setReferralInfo({
        type: referralCode.type === 'ADMIN_CENTER' ? 'Admin Referral' : 'Center Referral',
        ownerName: referralCode.ownerName,
      });
      setReferralType('CENTER');
      return;
    }

    // Check if it's a student center code (CC prefix fallback)
    if (normalizedCode.startsWith('CC') && normalizedCode.length >= 6) {
      setReferralInfo({
        type: 'Center Code',
        ownerName: 'Authorized Center',
      });
      setReferralType('CENTER');
      return;
    }

    // Invalid code if nothing matched
    setReferralInfo(null);
    setReferralType(null);
  };

  const steps: { key: Step; label: string; description: string }[] = [
    { key: 'identity', label: 'Identity', description: 'Basic info & Referral' },
    { key: 'payment', label: 'Payment', description: 'Exam donation payment' },
    { key: 'address', label: 'Details', description: 'Address & School' },
    { key: 'consent', label: 'Consent', description: 'Legal agreements' },
    { key: 'review', label: 'Review', description: 'Final confirmation' },
    { key: 'success', label: 'Complete', description: 'Referral link' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  const updateField = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };

      // If state changes, reset district
      if (field === 'addressState') {
        newData.addressDistrict = '';
      }

      return newData;
    });

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateIdentityStep = async (): Promise<boolean> => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    // Personal checks
    if (!formData.name.trim()) newErrors.name = 'Student name is required';
    if (!formData.class) newErrors.class = 'Class is required';
    if (!formData.photoUrl) newErrors.photoUrl = 'Please upload a passport-size photo';

    // Mobile - required + format check only (same mobile allowed for family members)
    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!isValidMobile(formData.mobile)) {
      newErrors.mobile = 'Invalid mobile number (10 digits required)';
    }

    // Email - must be unique, no duplicate profiles allowed
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    } else {
      try {
        const existing = await getStudentByEmail(formData.email.trim().toLowerCase());
        if (existing) {
          newErrors.email = 'This email is already registered. Please use a different email or login.';
        }
      } catch (e) {
        // If RLS blocks the check, backend auth.signUp will catch duplicate anyway
        console.warn('Email duplicate check failed (RLS), will rely on backend auth:', e);
      }
    }

    if (!formData.password?.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Referral Code check
    if (!formData.referredByCenter.trim()) {
      newErrors.referredByCenter = 'Referral code is required to register';
    } else if (!referralInfo) {
      newErrors.referredByCenter = 'Invalid or inactive referral code';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };



  const validateAddressStep = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.addressVillage.trim()) newErrors.addressVillage = 'Village/Locality is required';
    if (!formData.addressBlock.trim()) newErrors.addressBlock = 'Block is required';
    if (!formData.addressTahsil.trim()) newErrors.addressTahsil = 'Tahsil is required';
    if (!formData.addressDistrict.trim()) newErrors.addressDistrict = 'District is required';
    if (!formData.addressState) newErrors.addressState = 'State is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateConsentStep = (): boolean => {
    if (!consentData.termsAccepted || !consentData.privacyAccepted || !consentData.referralPolicyAccepted) {
      setConsentError('You must accept all terms and policies to proceed with registration.');
      return false;
    }
    setConsentError('');
    return true;
  };

  const handleNext = async () => {
    if (step === 'identity') {
      if (await validateIdentityStep()) {
        await processIdentityAndMoveToPayment();
      }
    } else if (step === 'payment') {
      if (paymentVerified) {
        setStep('address');
      } else {
        // [DEMO MODE] Allow bypassing if razorpay is not working
        // This is a temporary bypass as requested by the user
        setPaymentVerified(true);
        setStep('address');
        toast({
          title: 'Payment Bypassed (Demo Mode)',
          description: 'Razorpay is disabled. Proceeding to registration.',
        });
      }
    } else if (step === 'address') {
      if (validateAddressStep()) setStep('consent');
    } else if (step === 'consent') {
      if (validateConsentStep()) setStep('review');
    }
  };

  const processIdentityAndMoveToPayment = async () => {
    setIsSubmitting(true);
    try {
      // 1. SignUp with backend
      const { data: authData, error: authError } = await backend.auth.signUp({
        email: formData.email,
        password: formData.password || 'password123',
        options: {
          data: {
            full_name: formData.name,
            phone: formData.mobile,
          },
        },
      });

      let userId = authData?.user?.id;

      if (authError) {
        // If user already exists, try to sign in instead to resume
        if (authError.message?.toLowerCase().includes('already registered')) {
          const { data: signInData, error: signInError } = await backend.auth.signInWithPassword({
            email: formData.email,
            password: formData.password || 'password123',
          });

          if (signInError) {
            // If sign in fails, it might be a wrong password or truly a different person
            throw new Error('This email is already registered. Please login with your password to continue.');
          }
          userId = signInData?.user?.id;
        } else {
          throw authError;
        }
      }

      if (!userId) throw new Error('Authentication failed');

      // 2. Check if Student record already exists for this user
      let student = await useStudentStore.getState().getStudentByEmail(formData.email);

      if (!student) {
        // Create PENDING Student record if it doesn't exist
        student = await addStudent({
          name: formData.name.trim(),
          fatherName: formData.fatherName.trim() || 'TBD',
          class: formData.class,
          mobile: formData.mobile.trim(),
          email: formData.email.trim().toLowerCase(),
          schoolName: formData.schoolName.trim() || 'TBD',
          schoolContact: formData.schoolContact.trim() || 'TBD',
          addressVillage: formData.addressVillage.trim() || 'TBD',
          addressBlock: formData.addressBlock.trim() || 'TBD',
          addressTahsil: formData.addressTahsil.trim() || 'TBD',
          addressDistrict: formData.addressDistrict.trim() || 'TBD',
          addressState: formData.addressState || INDIAN_STATES[0],
          referredByCenter: referralType === 'CENTER' ? formData.referredByCenter.trim().toUpperCase() : undefined,
          referredByStudent: referralType === 'STUDENT' ? formData.referredByCenter.trim().toUpperCase() : undefined,
        }, userId);
      }

      if (!student) throw new Error('Student profile creation failed');

      setPendingStudentId(student.id);

      // Check if already paid
      const hasPaid = usePaymentStore.getState().hasSuccessfulPayment(student.id);
      if (hasPaid) {
        setPaymentVerified(true);
        setStep('address');
        toast({ title: 'Welcome back!', description: 'Resuming your registration.' });
      } else {
        setStep('payment');
        toast({ title: 'Account Verified', description: 'Proceed with exam donation payment.' });
      }

    } catch (error: any) {
      console.error('Identity Process Error:', error);
      toast({
        title: 'Registration Status',
        description: error.message || 'Identity verification failed.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingStudentId) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({ title: "Invalid File", description: "Only JPG, PNG and WebP are allowed.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "File Too Large", description: "Image size must be less than 2MB.", variant: "destructive" });
      return;
    }

    setIsUploadingProof(true);
    try {
      const compressedBase64 = await compressImage(file, 1000);
      const res = await fetch(compressedBase64);
      const blob = await res.blob();
      const fileExt = file.name.split('.').pop() || 'jpg';
      const compressedFile = new File([blob], file.name, { type: blob.type || 'image/jpeg' });

      const fileName = `proof_${pendingStudentId}_${Date.now()}.${fileExt}`;
      const filePath = fileName;
      const { error: uploadError } = await backend.storage
        .from('payment-proofs')
        .upload(filePath, compressedFile, { contentType: compressedFile.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = backend.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      setManualProofUrl(publicUrl);
      toast({ title: "Success", description: "Payment screenshot uploaded successfully." });
    } catch (error) {
      console.error("Upload error", error);
      toast({ title: "Upload Failed", description: "Could not upload screenshot.", variant: "destructive" });
    } finally {
      setIsUploadingProof(false);
      if (proofInputRef.current) proofInputRef.current.value = '';
    }
  };

  const handlePayment = async () => {
    if (!pendingStudentId || isProcessingPayment) return;
    
    // Validate transaction ID - minimum 10 characters
    if (!manualTransactionId.trim()) {
      toast({ title: "Transaction ID Required", description: "Please enter your payment Transaction ID.", variant: "destructive" });
      return;
    }
    if (manualTransactionId.trim().length < 10) {
      toast({ title: "Invalid Transaction ID", description: "Transaction ID must be at least 10 characters.", variant: "destructive" });
      return;
    }
    if (!manualProofUrl) {
      toast({ title: "Screenshot Required", description: "Please upload your payment success screenshot.", variant: "destructive" });
      return;
    }
    if (!paymentConfirmationChecked) {
      toast({ title: "Confirmation Required", description: "Please confirm that you have completed the payment.", variant: "destructive" });
      return;
    }

    setIsProcessingPayment(true);
    try {
      const amount = getExamFee(formData.class);
      // Create a pending payment record if it doesn't already exist or update current one
      let payment = usePaymentStore.getState().getPaymentsByStudent(pendingStudentId).find(p => p.status === 'PENDING');

      if (!payment) {
        payment = await createPayment(pendingStudentId, amount);
      }

      if (!payment) throw new Error('Payment record creation failed.');

      const updated = await usePaymentStore.getState().submitManualPayment(
        payment.id,
        manualTransactionId.trim(),
        manualProofUrl
      );

      if (updated) {
        // Generate application ID
        const appId = `NSEP-${new Date().getTime().toString(36).toUpperCase()}-${pendingStudentId?.slice(0, 8).toUpperCase()}`;
        setSubmittedApplicationId(appId);
        
        // Show success modal
        setShowApplicationModal(true);
        
        // Continue to address step
        setPaymentVerified(true);
        setStep('address');
      }
    } catch (error: any) {
      console.error('Manual Payment Error:', error);
      toast({
        variant: 'destructive',
        title: 'Submission Error',
        description: error.message || 'Failed to submit payment details.',
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingStudentId) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({ title: "Invalid File", description: "Only JPG, PNG and WebP are allowed.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "File Too Large", description: "Image size must be less than 2MB.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const compressedBase64 = await compressImage(file, 800);
      const res = await fetch(compressedBase64);
      const blob = await res.blob();
      const fileExt = file.name.split('.').pop() || 'jpg';
      const compressedFile = new File([blob], file.name, { type: blob.type || 'image/jpeg' });

      const fileName = `${pendingStudentId}_${Date.now()}.${fileExt}`;
      const filePath = fileName;
      const { error: uploadError } = await backend.storage
        .from('student-photos')
        .upload(filePath, compressedFile, { contentType: compressedFile.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = backend.storage
        .from('student-photos')
        .getPublicUrl(filePath);

      updateField('photoUrl', publicUrl);

      // Save it immediately so they don't lose it if they refresh
      await useStudentStore.getState().updateStudent(pendingStudentId, { photoUrl: publicUrl });
      toast({ title: "Success", description: "Profile photo uploaded successfully." });
    } catch (error) {
      console.error("Upload error", error);
      toast({ title: "Upload Failed", description: "Could not upload photo.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (!formData.photoUrl || !pendingStudentId) return;

    setIsUploading(true);
    try {
      const urlMatches = formData.photoUrl.match(/student-photos\/(.+)$/);
      if (urlMatches && urlMatches[1]) {
        await backend.storage.from('student-photos').remove([urlMatches[1]]);
      }

      updateField('photoUrl', '');
      await useStudentStore.getState().updateStudent(pendingStudentId, { photoUrl: null });
      toast({ title: "Success", description: "Photo removed successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove photo.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleBack = () => {
    if (step === 'payment') setStep('identity');
    else if (step === 'address') setStep('payment');
    else if (step === 'consent') setStep('address');
    else if (step === 'review') setStep('consent');
  };

  const handleSubmit = async () => {
    if (!paymentVerified) {
      toast({ title: 'Payment Required', description: 'You must pay the exam donation to complete registration.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (!pendingStudentId) throw new Error('Student profile context lost. Please refresh.');

      // Final update of student record with all form data
      const student = await useStudentStore.getState().updateStudent(pendingStudentId, {
        fatherName: formData.fatherName.trim(),
        schoolName: formData.schoolName.trim(),
        schoolContact: formData.schoolContact.trim(),
        addressVillage: formData.addressVillage.trim(),
        addressBlock: formData.addressBlock.trim(),
        addressTahsil: formData.addressTahsil.trim(),
        addressDistrict: formData.addressDistrict.trim(),
        addressState: formData.addressState,
        status: 'ACTIVE'
      });

      if (!student) throw new Error('Failed to finalize student profile.');

      setRegisteredStudent(student);
      setStep('success');
      toast({ title: 'Registration Finalized! 🎉', description: 'Welcome to NSEP 2026.' });

    } catch (error: any) {
      console.error('Final Submission Error:', error);
      toast({ title: 'Submission Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const examFee = formData.class ? getExamFee(formData.class) : 0;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <Link to="/" className="inline-flex items-center gap-3 text-primary mb-10 group bg-primary/10 px-6 py-3 rounded-full border border-primary/20 backdrop-blur-md shadow-[0_0_20px_rgba(33,150,243,0.1)] hover:scale-105 transition-all">
            <GraduationCap className="size-8" />
            <span className="text-2xl font-black text-foreground tracking-tighter">{APP_CONFIG.shortName}</span>
          </Link>
          <h1 className="text-5xl lg:text-7xl font-black text-foreground mb-6 tracking-tight">
            Student <span className="text-primary">Registration</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto font-bold italic">
            Begin your journey towards academic excellence and scholarship rewards.
          </p>
        </div>

        {/* Progress */}
        {showReferralGate ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-background rounded-[3.5rem] p-10 lg:p-16 border border-border shadow-lg hover:shadow-xl transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] -z-10 group-hover:bg-primary/10 transition-colors" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-accent/5 rounded-full blur-[80px] -z-10" />

              <div className="text-center relative z-10">
                <div className="mx-auto size-28 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-[0_0_40px_rgba(33,150,243,0.1)] border border-primary/20">
                  <Users className="size-14 text-primary animate-pulse" />
                </div>
                <h2 className="text-4xl lg:text-5xl font-black text-foreground mb-6 tracking-tighter">Referral Required</h2>
                <p className="text-xl text-muted-foreground font-bold italic leading-relaxed max-w-xl mx-auto mb-12">
                  To ensure the integrity of the NSEP mission, registration is exclusively via trusted referrals.
                </p>

                <div className="space-y-10">
                  <div className="bg-secondary/10 rounded-[2rem] p-8 border border-border">
                    <p className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-3">Entrance Protocol</p>
                    <p className="text-muted-foreground font-bold italic">
                      Obtain a unique access link or code from an authorized center or fellow scholar.
                    </p>
                  </div>

                  <div className="space-y-6 pt-4 max-w-md mx-auto">
                    <div className="flex flex-col gap-4">
                      <Label htmlFor="manual-ref" className="text-muted-foreground font-black uppercase tracking-widest text-[10px] ml-1">Access Authorization Code</Label>
                      <div className="flex gap-4">
                        <Input
                          placeholder="EX: ADM-XXXX-XXXX"
                          id="manual-ref"
                          className="h-16 bg-background border border-border rounded-2xl text-center text-xl font-mono tracking-[0.2em] text-foreground focus:border-primary/50 transition-all placeholder:text-muted-foreground/30"
                          maxLength={16}
                        />
                        <Button
                          onClick={() => {
                            const code = (document.getElementById('manual-ref') as HTMLInputElement).value;
                            if (code) {
                              navigate(`/register?ref=${code.trim().toUpperCase()}`);
                            }
                          }}
                          className="h-16 px-10 rounded-2xl bg-primary text-white font-black text-lg shadow-[0_0_20px_rgba(33,150,243,0.3)] hover:bg-primary/90 transition-all shrink-0"
                        >
                          Verify
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-10">
                    <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground transition-colors group">
                      <Link to="/" className="text-sm font-black uppercase tracking-widest">
                        <ArrowLeft className="size-4 mr-3 group-hover:-translate-x-1 transition-transform" />
                        Cancel Registration
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Progress Steps */}
            <div className="mb-12">
              <div className="flex items-center justify-between">
                {steps.map((s, index) => (
                  <div key={s.key} className="flex-1 flex items-center">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`size-12 rounded-2xl flex items-center justify-center text-sm font-black transition-all duration-500 shadow-xl ${index < currentStepIndex
                          ? 'bg-accent text-white scale-90'
                          : index === currentStepIndex
                            ? 'bg-primary text-white scale-110 shadow-[0_0_20px_rgba(33,150,243,0.4)]'
                            : 'bg-primary/10 text-muted-foreground border border-border'
                          }`}
                      >
                        {index < currentStepIndex ? <CheckCircle className="size-6" /> : index + 1}
                      </div>
                      <div className="mt-4 text-center hidden sm:block">
                        <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${index <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'
                          }`}>
                          {s.label}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-bold italic">{s.description}</div>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`h-[2px] w-full mx-4 rounded-full transition-all duration-1000 ${index < currentStepIndex ? 'bg-gradient-to-r from-accent to-primary' : 'bg-primary/10'
                        }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-background rounded-[3.5rem] border border-border shadow-3xl overflow-hidden mb-20">
              <div className="p-10 lg:p-14 border-b border-border bg-secondary/20">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
                    <FileText className="size-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-foreground tracking-tight">{steps[currentStepIndex].label} Profile</h2>
                    <p className="text-muted-foreground font-bold italic">{steps[currentStepIndex].description}</p>
                  </div>
                </div>
              </div>
              <div className="p-10 lg:p-14 max-h-[70vh] sm:max-h-[75vh] md:max-h-[80vh] overflow-y-auto custom-scrollbar">
                {/* Identity Step */}
                {step === 'identity' && (
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Student Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => updateField('name', e.target.value)}
                          placeholder="Enter full name"
                          className={errors.name ? 'border-destructive' : ''}
                        />
                        {errors.name && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="size-3" /> {errors.name}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mobile">Mobile Number *</Label>
                        <Input
                          id="mobile"
                          value={formData.mobile}
                          onChange={(e) => updateField('mobile', e.target.value.replace(/\D/g, ''))}
                          placeholder="10-digit mobile number"
                          maxLength={10}
                          className={errors.mobile ? 'border-destructive' : ''}
                        />
                        {errors.mobile && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="size-3" /> {errors.mobile}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => updateField('email', e.target.value)}
                          placeholder="your.email@example.com"
                          autoComplete="off"
                          className={errors.email ? 'border-destructive' : ''}
                        />
                        {errors.email && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="size-3" /> {errors.email}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => updateField('password', e.target.value)}
                          placeholder="Min 6 characters"
                          autoComplete="new-password"
                          className={errors.password ? 'border-destructive' : ''}
                        />
                        {errors.password && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="size-3" /> {errors.password}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fatherName">Father's Name / Guardian *</Label>
                      <Input
                        id="fatherName"
                        value={formData.fatherName}
                        onChange={(e) => updateField('fatherName', e.target.value)}
                        placeholder="Enter father's name"
                        className={errors.fatherName ? 'border-destructive' : ''}
                      />
                      {errors.fatherName && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="size-3" /> {errors.fatherName}
                        </p>
                      )}
                    </div>

                    {/* Profile Photo Upload - Right in Identity Step */}
                    <div className="border rounded-lg p-4 bg-blue-50/50 border-blue-200">
                      <Label className="text-sm font-semibold mb-3 block">
                        <Camera className="size-4 inline mr-1" />
                        Profile Photo (Passport Size) *
                      </Label>
                      <div className="flex items-center gap-4">
                        <div className="relative group shrink-0">
                          <div className="size-20 rounded-full border-4 border-white shadow-md overflow-hidden bg-muted flex items-center justify-center">
                            {formData.photoUrl ? (
                              <img src={formData.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <User className="size-8 text-muted-foreground" />
                            )}
                          </div>
                          {formData.photoUrl && (
                            <button
                              type="button"
                              className="absolute -top-1 -right-1 size-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600"
                              onClick={() => updateField('photoUrl', '')}
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <p className="text-xs text-muted-foreground">
                            Recent passport-size photo. Used on admit card & certificate.
                          </p>
                          <input
                            type="file"
                            id="photoInput"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 5 * 1024 * 1024) {
                                toast({ title: 'File too large', description: 'Max 5MB allowed.', variant: 'destructive' });
                                return;
                              }
                              try {
                                const compressToast = toast({ title: "Uploading Photo", description: "Please wait..." });
                                const compressedBase64 = await compressImage(file, 800);

                                // Convert base64 to File for upload
                                const res = await fetch(compressedBase64);
                                const blob = await res.blob();
                                const fileExt = file.name.split('.').pop() || 'jpg';
                                const compressedFile = new File([blob], file.name, { type: blob.type || 'image/jpeg' });

                                // Upload to student-photos bucket
                                const fileName = `student-temp-${Date.now()}.${fileExt}`;
                                const { error: uploadError } = await backend.storage
                                  .from('student-photos')
                                  .upload(fileName, compressedFile, { contentType: compressedFile.type });

                                if (uploadError) throw uploadError;

                                const { data: { publicUrl } } = backend.storage
                                  .from('student-photos')
                                  .getPublicUrl(fileName);

                                compressToast.dismiss();
                                updateField('photoUrl', publicUrl);
                                toast({ title: 'Photo Uploaded ✓' });
                              } catch (err) {
                                console.error('Upload Error:', err);
                                toast({ title: 'Error', description: 'Could not upload image.', variant: 'destructive' });
                              }
                              e.target.value = '';
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('photoInput')?.click()}
                            className="gap-1"
                          >
                            <Upload className="size-3" />
                            {formData.photoUrl ? 'Change Photo' : 'Upload Photo'}
                          </Button>
                        </div>
                      </div>
                      {errors.photoUrl && (
                        <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                          <AlertCircle className="size-3" /> {errors.photoUrl}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="class">Class *</Label>
                      <Select
                        value={formData.class ? formData.class.toString() : ''}
                        onValueChange={(value) => updateField('class', parseInt(value))}
                      >
                        <SelectTrigger className={errors.class ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {CLASSES.map((cls) => (
                            <SelectItem key={cls} value={cls.toString()}>
                              Class {cls}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.class && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="size-3" /> {errors.class}
                        </p>
                      )}
                      {formData.class > 0 && (
                        <div className="mt-4">
                          <Button
                            type="button"
                            onClick={handleNext}
                            className="w-full py-8 border-2 border-green-200 bg-green-50 hover:bg-green-100 transition-all flex justify-between items-center px-6 group"
                          >
                            <div className="text-left">
                              <p className="text-[10px] text-green-700 font-bold uppercase tracking-widest mb-1">
                                Examination Fee
                              </p>
                              <p className="text-2xl font-black text-green-600">
                                {formatCurrency(getExamFee(formData.class))}
                              </p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                              <div className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 group-hover:bg-green-700">
                                Pay Now & Continue <ArrowRight className="size-3" />
                              </div>
                              <div className="flex items-center gap-1 opacity-60">
                                <Shield className="size-3 text-green-700" />
                                <span className="text-[10px] text-green-800 font-medium">Securely via Razorpay</span>
                              </div>
                            </div>
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="schoolName">School Name *</Label>
                        <Input
                          id="schoolName"
                          value={formData.schoolName}
                          onChange={(e) => updateField('schoolName', e.target.value)}
                          placeholder="Enter school name"
                          className={errors.schoolName ? 'border-destructive' : ''}
                        />
                        {errors.schoolName && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="size-3" /> {errors.schoolName}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="schoolContact">School Contact *</Label>
                        <Input
                          id="schoolContact"
                          value={formData.schoolContact}
                          onChange={(e) => updateField('schoolContact', e.target.value)}
                          placeholder="10-digit mobile number"
                          maxLength={10}
                          className={errors.schoolContact ? 'border-destructive' : ''}
                        />
                        {errors.schoolContact && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="size-3" /> {errors.schoolContact}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                      <Label htmlFor="centerCode" className="text-sm font-semibold mb-2 block italic text-primary">
                        Referral Code (Mandatory) *
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="centerCode"
                          value={formData.referredByCenter}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            updateField('referredByCenter', val);
                            validateReferralCode(val);
                          }}
                          placeholder="e.g., CC-XXXX or NSEP2026"
                          className={errors.referredByCenter ? 'border-destructive' : 'bg-white'}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="p-0 h-auto text-[10px] text-blue-600 underline"
                        onClick={() => {
                          updateField('referredByCenter', APP_CONFIG.masterReferralCode);
                          validateReferralCode(APP_CONFIG.masterReferralCode);
                        }}
                      >
                        Don't have a code? Use Master Code: {APP_CONFIG.masterReferralCode}
                      </Button>
                      {errors.referredByCenter && (
                        <p className="text-xs text-destructive mt-1 font-semibold">{errors.referredByCenter}</p>
                      )}
                      {referralInfo && (
                        <div className="mt-2 text-[10px] text-green-600 font-medium flex items-center gap-1">
                          <CheckCircle className="size-3" /> {referralInfo.type}: {referralInfo.ownerName}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Payment Step */}
                {step === 'payment' && (
                  <div className="space-y-8 py-4">
                    <div className="text-center space-y-3">
                      <div className="inline-flex items-center justify-center">
                        <div className="size-20 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-[0_0_30px_rgba(33,150,243,0.1)]">
                          <QrCode className="size-10 text-primary" />
                        </div>
                      </div>
                      <h3 className="text-4xl font-black text-foreground tracking-tight">Complete Your Payment</h3>
                      <p className="text-base text-muted-foreground font-semibold">
                        Pay <span className="text-primary font-black">{formatCurrency(getExamFee(formData.class))}</span> to activate your exam access
                      </p>
                      <div className="pt-2 inline-flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full border border-green-200/50">
                        <div className="size-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-black text-green-700 uppercase tracking-wider">Secure & Verified Payment</span>
                      </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-10 items-center justify-center">
                      {/* QR Code Section */}
                      <div className="bg-background p-8 rounded-[2.5rem] border-2 border-primary/20 shadow-[0_0_40px_rgba(33,150,243,0.05)] transition-all hover:shadow-[0_0_50px_rgba(33,150,243,0.1)]">
                        <PaymentQRCode
                          amount={getExamFee(formData.class)}
                          size={256}
                          className="size-64"
                        />
                        <div className="mt-8 text-center space-y-2">
                          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground">Exam Fee</p>
                          <p className="text-4xl font-black premium-text-gradient">{formatCurrency(getExamFee(formData.class))}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold italic">Class {formData.class} | UPI or Bank Transfer</p>
                        </div>
                      </div>

                      <div className="hidden lg:flex items-center">
                        <ArrowRight className="size-12 text-primary/30" />
                      </div>
                      <div className="lg:hidden flex items-center">
                        <ArrowRight className="size-12 text-primary/30 rotate-90" />
                      </div>

                      {/* Form Section */}
                      <div className="flex-1 w-full max-w-md space-y-6">
                        {/* Razorpay Link Button */}
                        <div className="bg-primary/5 border-2 border-primary/20 p-6 rounded-[2rem] text-center space-y-4 shadow-sm hover:shadow-md transition-all">
                          <p className="text-xs font-black text-primary uppercase tracking-[0.2em]">Fastest Method</p>
                          <h4 className="text-lg font-bold">Pay via Razorpay Link</h4>
                          <Button 
                            className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black rounded-2xl gap-2 shadow-lg shadow-primary/20"
                            onClick={() => window.open('https://razorpay.me/@grampanchayathelpdeskmission', '_blank')}
                          >
                            <CreditCard className="size-5" />
                            Open Razorpay Page
                            <ArrowRight className="size-4" />
                          </Button>
                          <p className="text-[10px] text-muted-foreground italic">Accepts UPI, Cards, NetBanking, & Wallets</p>
                        </div>

                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border"></span>
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-4 text-muted-foreground font-black tracking-widest">OR SCAN & SUBMIT</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="transactionId" className="text-muted-foreground font-black uppercase tracking-widest text-[11px] ml-1 flex items-center gap-2">
                            <span className="size-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">1</span>
                            Transaction ID / UTR
                          </Label>
                          <Input
                            id="transactionId"
                            value={manualTransactionId}
                            onChange={(e) => setManualTransactionId(e.target.value)}
                            placeholder="Enter 12-digit transaction ID from receipt"
                            className="h-14 bg-input border-border rounded-2xl text-foreground font-mono placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-primary/20 text-sm"
                          />
                          <p className="text-[10px] text-muted-foreground">You'll find this in your payment confirmation email/SMS</p>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-muted-foreground font-black uppercase tracking-widest text-[11px] ml-1 flex items-center gap-2">
                            <span className="size-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">2</span>
                            Payment Proof Screenshot
                          </Label>
                          <div
                            onClick={() => proofInputRef.current?.click()}
                            className={`h-40 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 cursor-pointer overflow-hidden relative group ${manualProofUrl
                              ? 'border-primary/50 bg-primary/5'
                              : 'border-primary/30 hover:border-primary/50 bg-primary/5 hover:bg-primary/10'
                              }`}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              ref={proofInputRef}
                              onChange={handleProofUpload}
                              disabled={isUploadingProof}
                            />

                            {isUploadingProof ? (
                              <div className="flex flex-col items-center gap-2">
                                <Loader2 className="size-8 text-primary animate-spin" />
                                <span className="text-[10px] font-black text-primary uppercase">Compressing & Uploading...</span>
                              </div>
                            ) : manualProofUrl ? (
                              <>
                                <img src={manualProofUrl} alt="Proof" className="absolute inset-0 w-full h-full object-cover opacity-25" />
                                <div className="z-10 bg-gradient-to-b from-transparent to-background/50 absolute inset-0 flex items-center justify-center">
                                  <div className="bg-primary/20 p-4 rounded-2xl border border-primary/30 backdrop-blur-sm">
                                    <CheckCircle className="size-8 text-primary" />
                                  </div>
                                </div>
                                <span className="z-10 text-[10px] font-black text-primary uppercase tracking-widest bg-primary/20 px-4 py-2 rounded-full backdrop-blur-md border border-primary/30">✓ Screenshot Added</span>
                              </>
                            ) : (
                              <>
                                <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 group-hover:scale-110 transition-transform">
                                  <Upload className="size-7 text-primary" />
                                </div>
                                <div className="text-center">
                                  <span className="text-[10px] font-black text-foreground uppercase tracking-widest block">Click to Upload Screenshot</span>
                                  <span className="text-[9px] text-muted-foreground mt-1">JPG, PNG or WebP • Max 2MB</span>
                                </div>
                              </>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">Take a screenshot of your "Payment Successful" message</p>
                        </div>

                        {/* Payment Confirmation Checkbox */}
                        <div className="flex items-start gap-3 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-2xl">
                          <Checkbox
                            id="paymentConfirmation"
                            checked={paymentConfirmationChecked}
                            onCheckedChange={(checked) => setPaymentConfirmationChecked(checked as boolean)}
                            className="mt-1"
                          />
                          <Label htmlFor="paymentConfirmation" className="text-sm text-yellow-800 font-semibold cursor-pointer leading-relaxed">
                            I confirm that I have completed the payment by scanning the QR code and uploading the payment screenshot.
                          </Label>
                        </div>

                        <Button
                          className="w-full h-16 rounded-[1.5rem] bg-gradient-to-r from-primary to-accent text-white font-black text-base shadow-[0_0_30px_rgba(33,150,243,0.3)] hover:shadow-[0_0_40px_rgba(33,150,243,0.4)] hover:scale-[1.02] transition-all flex items-center gap-3"
                          onClick={handlePayment}
                          disabled={isProcessingPayment || isUploadingProof || !manualTransactionId.trim() || !manualProofUrl || !paymentConfirmationChecked}
                        >
                          {isProcessingPayment ? (
                            <>
                              <Loader2 className="size-6 animate-spin" />
                              Processing Payment...
                            </>
                          ) : (
                            <>
                              💳 Pay & Continue Filling Form
                              <ArrowRight className="size-6" />
                            </>
                          )}
                        </Button>

                        <div className="space-y-2 text-[10px] text-muted-foreground p-3 bg-secondary/20 rounded-xl border border-border">
                          <p className="font-bold flex items-center gap-2">
                            <span className="size-4 rounded-full bg-primary/20 text-primary flex items-center justify-center">?</span>
                            Need Help?
                          </p>
                          <ul className="space-y-1 ml-6 list-disc">
                            <li>No confirmation email? Check spam folder</li>
                            <li>Can't find ID? Look in your payment app's transaction history</li>
                            <li>Still stuck? Contact support@gphdm.com</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Approval Timeline */}
                    <div className="space-y-4">
                      {/* Quick Action Card */}
                      <div className="bg-green-50 border-2 border-green-200 p-6 rounded-[2rem] flex gap-4 items-start">
                        <div className="size-12 rounded-full bg-green-200 flex items-center justify-center shrink-0 text-green-700 text-xl font-black">✓</div>
                        <div>
                          <h4 className="text-green-900 font-black uppercase text-sm tracking-wider mb-1">No Need to Wait!</h4>
                          <p className="text-green-800 text-sm font-semibold">
                            After paying & confirming, you can <span className="underline">immediately continue filling your personal details, address, and photo</span>. Your payment will be verified in the background while you complete registration.
                          </p>
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 rounded-[2rem] border border-primary/20">
                        <h4 className="text-foreground font-black text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Clock className="size-5 text-primary animate-pulse" />
                          What Happens After Payment
                        </h4>
                        
                        <div className="space-y-4">
                          {/* Timeline Steps */}
                          <div className="space-y-3">
                            <div className="flex gap-4">
                              <div className="flex flex-col items-center">
                                <div className="size-10 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-primary font-bold text-sm">✓</div>
                                <div className="w-0.5 h-8 bg-primary/30 mt-1"></div>
                              </div>
                              <div className="pt-2">
                                <p className="font-black text-foreground text-xs uppercase tracking-wider">STEP 1: Submit Payment Details</p>
                                <p className="text-muted-foreground text-xs mt-1">After clicking "Pay & Continue", your transaction ID and screenshot are recorded</p>
                              </div>
                            </div>

                            <div className="flex gap-4">
                              <div className="flex flex-col items-center">
                                <div className="size-10 rounded-full bg-accent/20 border-2 border-accent/50 flex items-center justify-center text-accent font-bold text-sm">👤</div>
                                <div className="w-0.5 h-8 bg-accent/30 mt-1"></div>
                              </div>
                              <div className="pt-2">
                                <p className="font-black text-foreground text-xs uppercase tracking-wider">STEP 2: Complete Your Profile</p>
                                <p className="text-muted-foreground text-xs mt-1">Immediately continue to fill your address, photo, and other details (Don't wait for payment approval!)</p>
                              </div>
                            </div>

                            <div className="flex gap-4">
                              <div className="flex flex-col items-center">
                                <div className="size-10 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center text-green-500 font-bold text-sm">🎯</div>
                                <div className="w-0.5 h-8 bg-green-500/30 mt-1"></div>
                              </div>
                              <div className="pt-2">
                                <p className="font-black text-foreground text-xs uppercase tracking-wider">STEP 3: Admin Verification (Background)</p>
                                <p className="text-muted-foreground text-xs mt-1">Our finance team verifies your payment within 2-4 hours (max 24-48 hours). You'll get email/SMS notification.</p>
                              </div>
                            </div>

                            <div className="flex gap-4">
                              <div className="flex flex-col items-center">
                                <div className="size-10 rounded-full bg-blue-500/20 border-2 border-blue-500/50 flex items-center justify-center text-blue-500 font-bold text-sm">🚀</div>
                              </div>
                              <div className="pt-2">
                                <p className="font-black text-foreground text-xs uppercase tracking-wider">FINAL: Exam Access Activated</p>
                                <p className="text-muted-foreground text-xs mt-1">Once payment is verified, your exam access is automatically activated. No further action needed!</p>
                              </div>
                            </div>
                          </div>

                          {/* Key Points */}
                          <div className="mt-6 p-4 bg-background rounded-xl border border-border">
                            <p className="font-black text-foreground text-[11px] uppercase tracking-wider mb-3 flex items-center gap-2">
                              <span className="size-1.5 rounded-full bg-primary"></span>
                              Quick Registration Flow
                            </p>
                            <ul className="space-y-2 text-[11px] text-muted-foreground">
                              <li className="flex gap-2">
                                <span className="text-primary font-black">1.</span>
                                <span><span className="font-bold text-foreground">Submit Payment Details</span> - Enter transaction ID & upload screenshot</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="text-primary font-black">2.</span>
                                <span><span className="font-bold text-foreground">Move to Step 3</span> - Immediately fill your personal details, address & photo</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="text-primary font-black">3.</span>
                                <span><span className="font-bold text-foreground">Finish Registration</span> - Review and submit your complete profile</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="text-primary font-black">4.</span>
                                <span><span className="font-bold text-foreground">Background Verification</span> - Admin verifies payment (24-48 hours max)</span>
                              </li>
                              <li className="flex gap-2">
                                <span className="text-primary font-black">5.</span>
                                <span><span className="font-bold text-foreground">Auto-Activation</span> - Exam access activated automatically once verified</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Important Notice */}
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200/50 flex gap-3">
                        <AlertCircle className="size-5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-800">
                          <p className="font-black mb-2">ℹ️ Payment & Continue Process:</p>
                          <p className="mb-2">After confirming your payment details, you'll move to the next step to fill your personal information, address, and profile photo. <span className="font-bold underline">Don't wait for admin approval</span> - continue with your registration right away!</p>
                          <p className="font-bold">✓ Save your transaction ID - you may need it for support queries</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Address Step */}
                {step === 'address' && (
                  <div className="space-y-4">
                    {/* Photo Upload Section */}
                    <div className="border-b pb-6 mb-4">
                      <Label className="text-base font-semibold mb-3 block">Profile Photo (Optional)</Label>
                      <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="relative group shrink-0">
                          <div className="size-24 rounded-full border-4 border-muted overflow-hidden bg-muted flex items-center justify-center relative shadow-sm">
                            {formData.photoUrl ? (
                              <img src={formData.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <User className="size-10 text-muted-foreground" />
                            )}
                            {isUploading && (
                              <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                                <Loader2 className="size-6 animate-spin text-primary" />
                              </div>
                            )}
                          </div>
                          {formData.photoUrl && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 size-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                              onClick={handleRemovePhoto}
                              disabled={isUploading}
                            >
                              <X className="size-3" />
                            </Button>
                          )}
                        </div>
                        <div className="space-y-3 flex-1 text-center sm:text-left">
                          <p className="text-sm text-muted-foreground">
                            Upload a recent passport-size photograph. This will be used for your admit card and certificate.
                          </p>
                          <div className="flex justify-center sm:justify-start">
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/webp"
                              className="hidden"
                              ref={fileInputRef}
                              onChange={handlePhotoUpload}
                              disabled={isUploading}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploading}
                              className="gap-2"
                            >
                              <Camera className="size-4" />
                              {formData.photoUrl ? 'Change Photo' : 'Upload Photo'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Primary Location Selection First */}
                    <div className="grid sm:grid-cols-2 gap-4 border-b pb-4 mb-4">
                      <div className="space-y-2">
                        <Label htmlFor="state">State *</Label>
                        <Select
                          value={formData.addressState}
                          onValueChange={(value) => updateField('addressState', value)}
                        >
                          <SelectTrigger id="state" className={errors.addressState ? 'border-destructive' : ''}>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {INDIAN_STATES.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.addressState && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="size-3" /> {errors.addressState}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="district">District *</Label>
                        {formData.addressState && STATE_DISTRICTS[formData.addressState] ? (
                          <Select
                            value={formData.addressDistrict}
                            onValueChange={(value) => updateField('addressDistrict', value)}
                          >
                            <SelectTrigger id="district" className={errors.addressDistrict ? 'border-destructive' : ''}>
                              <SelectValue placeholder="Select district" />
                            </SelectTrigger>
                            <SelectContent>
                              {STATE_DISTRICTS[formData.addressState].map((dist) => (
                                <SelectItem key={dist} value={dist}>
                                  {dist}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id="district"
                            value={formData.addressDistrict}
                            onChange={(e) => updateField('addressDistrict', e.target.value)}
                            placeholder={formData.addressState ? "Enter district" : "Select state first"}
                            disabled={!formData.addressState}
                            className={errors.addressDistrict ? 'border-destructive' : ''}
                          />
                        )}
                        {errors.addressDistrict && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="size-3" /> {errors.addressDistrict}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="village">Village / Locality *</Label>
                        <Input
                          id="village"
                          value={formData.addressVillage}
                          onChange={(e) => updateField('addressVillage', e.target.value)}
                          placeholder="Enter village or locality"
                          className={errors.addressVillage ? 'border-destructive' : ''}
                        />
                        {errors.addressVillage && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="size-3" /> {errors.addressVillage}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="block">Block *</Label>
                        <Input
                          id="block"
                          value={formData.addressBlock}
                          onChange={(e) => updateField('addressBlock', e.target.value)}
                          placeholder="Enter block"
                          className={errors.addressBlock ? 'border-destructive' : ''}
                        />
                        {errors.addressBlock && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="size-3" /> {errors.addressBlock}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tahsil">Tahsil *</Label>
                        <Input
                          id="tahsil"
                          value={formData.addressTahsil}
                          onChange={(e) => updateField('addressTahsil', e.target.value)}
                          placeholder="Enter tahsil"
                          className={errors.addressTahsil ? 'border-destructive' : ''}
                        />
                        {errors.addressTahsil && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="size-3" /> {errors.addressTahsil}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Consent Step */}
                {step === 'consent' && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-800 mb-2">Legal Consent Required</h3>
                      <p className="text-sm text-blue-700">
                        Please read and accept all terms and policies to proceed with registration.
                        Your consent will be logged as per Indian IT regulations.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Terms of Service */}
                      <div className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <Checkbox
                          id="terms"
                          checked={consentData.termsAccepted}
                          onCheckedChange={(checked) => {
                            setConsentData(prev => ({ ...prev, termsAccepted: !!checked }));
                            setConsentError('');
                          }}
                        />
                        <div className="flex-1">
                          <Label htmlFor="terms" className="flex items-center gap-2 cursor-pointer">
                            <FileText className="size-4 text-blue-600" />
                            <span className="font-medium">Terms of Service</span>
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            I have read and agree to the{' '}
                            <Link to="/terms" target="_blank" className="text-primary hover:underline">
                              Terms of Service
                            </Link>
                            , including examination rules, refund policy, and code of conduct.
                          </p>
                        </div>
                      </div>

                      {/* Privacy Policy */}
                      <div className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <Checkbox
                          id="privacy"
                          checked={consentData.privacyAccepted}
                          onCheckedChange={(checked) => {
                            setConsentData(prev => ({ ...prev, privacyAccepted: !!checked }));
                            setConsentError('');
                          }}
                        />
                        <div className="flex-1">
                          <Label htmlFor="privacy" className="flex items-center gap-2 cursor-pointer">
                            <Shield className="size-4 text-green-600" />
                            <span className="font-medium">Privacy Policy</span>
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            I have read and agree to the{' '}
                            <Link to="/privacy" target="_blank" className="text-primary hover:underline">
                              Privacy Policy
                            </Link>
                            , including data collection, storage, and processing practices.
                          </p>
                        </div>
                      </div>

                      {/* Referral Policy */}
                      <div className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <Checkbox
                          id="referral"
                          checked={consentData.referralPolicyAccepted}
                          onCheckedChange={(checked) => {
                            setConsentData(prev => ({ ...prev, referralPolicyAccepted: !!checked }));
                            setConsentError('');
                          }}
                        />
                        <div className="flex-1">
                          <Label htmlFor="referral" className="flex items-center gap-2 cursor-pointer">
                            <Users className="size-4 text-orange-600" />
                            <span className="font-medium">Referral Policy</span>
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            I understand and agree to the CenterCode referral program terms, including that
                            self-referrals are prohibited and may result in account suspension.
                          </p>
                        </div>
                      </div>
                    </div>

                    {consentError && (
                      <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                        <AlertCircle className="size-4" />
                        {consentError}
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
                      <p>
                        <strong>Note:</strong> By accepting these terms, you consent to the collection and processing
                        of your data as described in our policies. Your consent details (IP address, timestamp,
                        policy version) will be logged for compliance purposes.
                      </p>
                    </div>
                  </div>
                )}

                {/* Success Step */}
                {step === 'success' && registeredStudent && (
                  <div className="space-y-8 py-4 text-center">
                    <div className="relative mx-auto size-24">
                      <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-25"></div>
                      <div className="relative size-24 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="size-12 text-green-600" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-3xl font-serif font-bold text-foreground">Registration Successful!</h2>
                      <p className="text-muted-foreground">Welcome to the NSEP 2026 community.</p>
                    </div>

                    <Card className="border-2 border-primary/20 bg-primary/5 shadow-inner">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center justify-center gap-2">
                          <Gift className="size-5 text-primary" />
                          Your Referral Reward Program
                        </CardTitle>
                        <CardDescription>
                          Share your code with friends and earn rewards for every successful registration!
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Your Referral Link</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              readOnly
                              value={`${window.location.origin}/register?ref=${registeredStudent.referralCode}`}
                              className="font-mono text-center bg-white border-2 select-all"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/register?ref=${registeredStudent.referralCode}`);
                                toast({ title: 'Copied!', description: 'Referral link copied to clipboard.' });
                              }}
                            >
                              <Copy className="size-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            className="bg-[#25D366] hover:bg-[#20ba5a] text-white flex items-center gap-2"
                            onClick={() => {
                              const text = `Hi! I just registered for the NSEP 2026 Scholarship Exam. Use my referral link to register and get started: ${window.location.origin}/register?ref=${registeredStudent.referralCode}`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                            }}
                          >
                            <Share2 className="size-4" />
                            WhatsApp
                          </Button>
                          <Button
                            variant="default"
                            className="institutional-gradient"
                            onClick={async () => {
                              await loginStudent(registeredStudent.email, registeredStudent.mobile);
                              navigate('/dashboard');
                            }}
                          >
                            Go to Dashboard
                            <ArrowRight className="size-4 ml-2" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <p className="text-sm text-muted-foreground italic">
                      TIP: You can find your referral link and reward status anytime in your student dashboard.
                    </p>
                  </div>
                )}
                {step === 'review' && (
                  <div className="space-y-6">
                    <div className="bg-muted rounded-lg p-4 space-y-3">
                      <h3 className="font-semibold">Personal Details</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">Name:</span>
                        <span>{formData.name}</span>
                        <span className="text-muted-foreground">Father's Name / Guardian:</span>
                        <span>{formData.fatherName}</span>
                        <span className="text-muted-foreground">Class:</span>
                        <span>Class {formData.class}</span>
                        <span className="text-muted-foreground">School:</span>
                        <span>{formData.schoolName}</span>
                      </div>
                    </div>

                    <div className="bg-muted rounded-lg p-4 space-y-3">
                      <h3 className="font-semibold">Contact Details</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-muted-foreground">Mobile:</span>
                        <span>{formData.mobile}</span>
                        <span className="text-muted-foreground">Email:</span>
                        <span>{formData.email}</span>
                        {formData.referredByCenter && (
                          <>
                            <span className="text-muted-foreground">Referral Code:</span>
                            <span>{formData.referredByCenter}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="bg-muted rounded-lg p-4 space-y-3">
                      <h3 className="font-semibold">Address</h3>
                      <p className="text-sm">
                        {formData.addressVillage}, {formData.addressBlock}, {formData.addressTahsil},{' '}
                        {formData.addressDistrict}, {formData.addressState}
                      </p>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                      <h3 className="font-semibold text-green-800">Legal Consent</h3>
                      <div className="text-sm text-green-700 space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="size-4" />
                          <span>Terms of Service accepted</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="size-4" />
                          <span>Privacy Policy accepted</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="size-4" />
                          <span>Referral Policy accepted</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-primary/10 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">Examination Fee</p>
                          <p className="text-sm text-muted-foreground">Class {formData.class} Category</p>
                        </div>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(examFee)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-6 pt-6 border-t">
                  {step !== 'identity' ? (
                    <Button variant="outline" onClick={handleBack}>
                      <ArrowLeft className="size-4 mr-2" />
                      Back
                    </Button>
                  ) : (
                    <div />
                  )}

                  {step !== 'review' && step !== 'success' ? (
                    <Button
                      onClick={handleNext}
                      disabled={isSubmitting || (step === 'identity' && isProcessingPayment)}
                    >
                      {step === 'identity' && formData.class > 0
                        ? `Pay ${formatCurrency(examFee)} & Continue`
                        : step === 'payment' ? 'Confirm Payment & Next' : 'Next'}
                      <ArrowRight className="size-4 ml-2" />
                    </Button>
                  ) : step === 'review' ? (
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="institutional-gradient"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Finalizing...
                        </>
                      ) : (
                        <>
                          Complete Registration
                          <CheckCircle className="size-4 ml-2" />
                        </>
                      )}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Login Link */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Already registered?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Login here
          </Link>
        </p>
      </div>

      {/* Payment Submitted Success Modal */}
      <Dialog open={showApplicationModal} onOpenChange={setShowApplicationModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="size-6" />
              Payment Submitted Successfully!
            </DialogTitle>
            <DialogDescription className="text-base">
              Your payment proof has been submitted. Our admin will verify your payment within 24–48 hours.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Application ID */}
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-4 rounded-xl border border-primary/20">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Your Application ID</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-primary tracking-wider">{submittedApplicationId}</span>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    navigator.clipboard.writeText(submittedApplicationId);
                    toast({ title: 'Copied!', description: 'Application ID copied to clipboard.' });
                  }}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center justify-center gap-2">
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300 px-4 py-2 text-sm">
                <Clock className="size-4 mr-1 animate-pulse" />
                Pending Approval
              </Badge>
            </div>

            {/* Instructions */}
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground">What's next?</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Continue filling your profile details</li>
                <li>Check your dashboard for verification status</li>
                <li>You will receive confirmation after approval</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => setShowApplicationModal(false)}
            >
              Continue Registration
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                setShowApplicationModal(false);
                navigate('/login');
              }}
            >
              <Download className="size-4 mr-2" />
              Login to Track Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
