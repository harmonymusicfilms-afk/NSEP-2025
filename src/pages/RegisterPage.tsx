import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, FileText, Shield, Users, Gift, Loader2, Copy, Share2, Camera, Upload, X, User, QrCode, Image as ImageIcon, Clock, Download, CreditCard } from 'lucide-react';
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
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [submittedApplicationId, setSubmittedApplicationId] = useState('');
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

    // Email check - simplified (Auth will catch duplicates and we handle resume flow there)
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
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
        const lowerMsg = authError.message?.toLowerCase() || '';
        if (lowerMsg.includes('already registered') ||
          lowerMsg.includes('already exists') ||
          lowerMsg.includes('already in use')) {
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
      } else if (student.status === 'PENDING') {
        // Update existing pending student with latest info (including class which determines fee)
        await useStudentStore.getState().updateStudent(student.id, {
          name: formData.name.trim(),
          fatherName: formData.fatherName.trim() || 'TBD',
          class: formData.class,
          mobile: formData.mobile.trim(),
          schoolName: formData.schoolName.trim() || 'TBD',
          schoolContact: formData.schoolContact.trim() || 'TBD',
          referredByCenter: referralType === 'CENTER' ? formData.referredByCenter.trim().toUpperCase() : undefined,
          referredByStudent: referralType === 'STUDENT' ? formData.referredByCenter.trim().toUpperCase() : undefined,
        });
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
        toast({ title: 'Profile Created ✓', description: 'Please complete your payment to proceed.' });
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



  const handleRazorpayCheckout = async () => {
    if (!pendingStudentId || isProcessingPayment) return;

    setIsProcessingPayment(true);
    
    try {
      // Redirect to the external payment link
      window.location.href = 'https://razorpay.me/@grampanchayathelpdeskmission';
    } catch (error: any) {
      console.error('Redirect Error:', error);
      toast({
        variant: 'destructive',
        title: 'Redirect Error',
        description: 'Failed to open payment page.',
      });
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
                            <div className="text-right">
                              <div className="bg-green-600 text-white px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 group-hover:bg-green-700 shadow-md transform group-hover:translate-x-1 transition-all">
                                Pay Fee & Register <ArrowRight className="size-4" />
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
                 {/* Payment Step */}
                {step === 'payment' && (
                  <div className="space-y-12 py-8 max-w-5xl mx-auto">
                    <div className="text-center space-y-3">
                      <div className="inline-flex items-center justify-center">
                        <div className="size-20 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 shadow-[0_0_30px_rgba(33,150,243,0.1)]">
                          <CreditCard className="size-10 text-primary" />
                        </div>
                      </div>
                      <h3 className="text-4xl font-black text-foreground tracking-tight">Complete Your Payment</h3>
                      <p className="text-base text-muted-foreground font-semibold">
                        Pay <span className="text-primary font-black">{formatCurrency(getExamFee(formData.class))}</span> to activate your exam access
                      </p>
                      <div className="pt-2 inline-flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full border border-green-200/50">
                        <div className="size-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-black text-green-700 uppercase tracking-wider">Secure Official Gateway</span>
                      </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-12 items-start justify-center">
                      {/* Razorpay SDK Button Section */}
                      <div className="flex-1 w-full max-w-md space-y-6">
                        <div className="bg-primary/5 border-2 border-primary/20 p-8 rounded-[2.5rem] text-center space-y-6 shadow-xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <CreditCard className="size-24 -rotate-12" />
                          </div>

                          <div className="relative z-10 space-y-4">
                            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-primary/20">
                              Payment Method
                            </div>

                            <div className="space-y-1">
                              <h4 className="text-2xl font-black text-foreground uppercase tracking-tight">Exam Registration</h4>
                              <p className="text-sm text-muted-foreground font-semibold italic">Class {formData.class} Scholorship Foundation</p>
                            </div>

                            <div className="text-5xl font-black text-primary py-2 tracking-tighter">
                              {formatCurrency(getExamFee(formData.class))}
                            </div>

                            <button
                              onClick={handleRazorpayCheckout}
                              className="w-full h-24 bg-primary text-white border-2 border-primary/20 rounded-2xl flex flex-col items-center justify-center gap-1 group/btn relative overflow-hidden hover:bg-primary/90 transition-all shadow-lg active:scale-95"
                            >
                              <div className="relative z-10 flex items-center gap-2 font-black">
                                <CreditCard className="size-6" />
                                <span className="text-xl uppercase tracking-wider">Pay Fee Now</span>
                              </div>
                              <p className="relative z-10 text-[10px] text-white/80 font-bold uppercase tracking-widest">Click to open Secure Gateway</p>
                            </button>

                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setPaymentVerified(true);
                                setStep('address');
                                toast({
                                  title: 'Registration Continued',
                                  description: 'Please complete your details and photo upload.',
                                });
                              }}
                              className="w-full border-green-200 text-green-700 hover:bg-green-50 font-bold"
                            >
                              I have completed payment <ArrowRight className="ml-2 size-4" />
                            </Button>

                            <div className="flex items-center justify-center gap-4 pt-4 opacity-60">

                              <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" alt="UPI" className="h-5" />
                              <img src="https://upload.wikimedia.org/wikipedia/commons/d/d1/RuPay.svg" alt="RuPay" className="h-4" />
                              <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-3" />
                            </div>
                          </div>
                        </div>

                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200/50 flex gap-4">
                          <Shield className="size-6 text-blue-600 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">Secure Payment Notice</p>
                            <p className="text-xs text-blue-800 font-medium">
                              Your payment is handled by Razorpay's bank-grade security. Profile will be unlocked immediately after success.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 text-[10px] text-muted-foreground p-4 bg-secondary/10 rounded-2xl border border-border">
                          <p className="font-bold flex items-center gap-2">
                            <span className="size-4 rounded-full bg-primary/20 text-primary flex items-center justify-center">?</span>
                            Need Help?
                          </p>
                          <ul className="space-y-1 ml-6 list-disc">
                            <li>Supported: UPI (PhonePe, GPay), Cards, NetBanking</li>
                            <li>Instant Confirmation: No need to upload screenshots</li>
                            <li>Support: {APP_CONFIG.supportEmail}</li>
                          </ul>
                        </div>
                      </div>

                      {/* Approval Timeline / Info Column */}
                      <div className="flex-1 w-full max-w-md space-y-6">
                        <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-8 rounded-[2.5rem] border border-primary/20 h-full">
                          <h4 className="text-foreground font-black text-base uppercase tracking-wider mb-6 flex items-center gap-3">
                            <Clock className="size-6 text-primary animate-pulse" />
                            Registration Process
                          </h4>

                          <div className="space-y-6">
                            <div className="flex gap-4">
                              <div className="flex flex-col items-center">
                                <div className="size-10 rounded-full bg-primary border-2 border-primary flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-primary/20">1</div>
                                <div className="w-0.5 h-full bg-primary/30 mt-1"></div>
                              </div>
                              <div className="pt-1">
                                <p className="font-black text-foreground text-sm uppercase tracking-wider">Online Payment</p>
                                <p className="text-muted-foreground text-xs mt-1 leading-relaxed">Fast & secure payment via the Razorpay gateway</p>
                              </div>
                            </div>

                            <div className="flex gap-4">
                              <div className="flex flex-col items-center">
                                <div className="size-10 rounded-full bg-accent/20 border-2 border-accent/50 flex items-center justify-center text-accent font-bold text-sm">2</div>
                                <div className="w-0.5 h-full bg-accent/30 mt-1"></div>
                              </div>
                              <div className="pt-1">
                                <p className="font-black text-foreground text-sm uppercase tracking-wider">Complete Profile</p>
                                <p className="text-muted-foreground text-xs mt-1 leading-relaxed">Fill your address, school details, and upload your photo</p>
                              </div>
                            </div>

                            <div className="flex gap-4">
                              <div className="flex flex-col items-center">
                                <div className="size-10 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center text-green-500 font-bold text-sm">3</div>
                              </div>
                              <div className="pt-1">
                                <p className="font-black text-foreground text-sm uppercase tracking-wider">Activation</p>
                                <p className="text-muted-foreground text-xs mt-1 leading-relaxed">Your application is complete! You can now access all features.</p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-8 p-4 bg-white/60 rounded-2xl border border-white/80 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-2 text-green-700 font-bold text-sm">
                              <CheckCircle className="size-5" />
                              Registration Benefits
                            </div>
                            <ul className="space-y-2 text-xs text-muted-foreground font-medium">
                              <li>• Official NSEP Admit Card Generation</li>
                              <li>• Smart Exam Access for Year {APP_CONFIG.year}</li>
                              <li>• Digital Participation Certificate</li>
                              <li>• Performance Analytics Dashboard</li>
                            </ul>
                          </div>
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
                      <h2 className="text-4xl font-serif font-black premium-text-gradient uppercase tracking-tighter">THANK YOU!</h2>
                      <h3 className="text-xl font-bold text-foreground">Registration Successful!</h3>
                      <p className="text-muted-foreground font-semibold italic">Welcome to the NSEP 2026 community.</p>
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

                  {step !== 'review' && step !== 'success' && (step !== 'identity' || formData.class === 0) ? (
                    <Button
                      onClick={handleNext}
                      disabled={isSubmitting || (step === 'identity' && isProcessingPayment)}
                    >
                      {step === 'payment' ? 'Confirm Payment & Next' : 'Next'}
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
            <DialogTitle className="flex items-center gap-2 text-green-700 text-2xl font-black italic">
              <CheckCircle className="size-8" />
              THANK YOU!
            </DialogTitle>
            <DialogDescription className="text-base font-bold text-foreground">
              धन्यवाद! आपका भुगतान सफलतापूर्वक जमा हो गया है। <br />
              <span className="text-sm text-muted-foreground font-normal">Your payment proof has been submitted. Our admin will verify it within 24–48 hours.</span>
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
