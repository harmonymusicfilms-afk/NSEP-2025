import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2,
  User,
  MapPin,
  FileText,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Upload,
  Shield,
  Phone,
  Mail,
  Camera,
  Gift,
  Users,
  Copy,
  Clock,
} from 'lucide-react';
import { CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { INDIAN_STATES, APP_CONFIG, REFERRAL_CONFIG } from '@/constants/config';
import { isValidEmail, isValidMobile, generateId, formatCurrency, generateCenterCode, compressImage, generateUUID } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { client as backend } from '@/lib/backend';
import { useAuthStore } from '@/stores';
import logoImg from '@/assets/gphdm-logo.png';

type Step = 'details' | 'owner' | 'payment' | 'address' | 'documents' | 'review' | 'success';

interface CenterFormData {
  centerName: string;
  centerType: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  ownerAadhaar: string;
  fullAddress: string;
  village: string;
  block: string;
  district: string;
  state: string;
  pincode: string;
  idProofUrl: string;
  userPhotoUrl: string;
  idProofName?: string;
  userPhotoName?: string;
  password?: string;
  transactionId: string;
  paymentScreenshotUrl: string;
  paymentScreenshotName?: string;
}

const initialFormData: CenterFormData = {
  centerName: '',
  centerType: '',
  ownerName: '',
  ownerPhone: '',
  ownerEmail: '',
  ownerAadhaar: '',
  fullAddress: '',
  village: '',
  block: '',
  district: '',
  state: '',
  pincode: '',
  idProofUrl: '',
  userPhotoUrl: '',
  password: '',
  transactionId: '',
  paymentScreenshotUrl: '',
};

const centerTypes = [
  'School',
  'Coaching Center',
  'Tuition Center',
  'NGO',
  'Community Center',
  'Other',
];

export function CenterRegistrationPage() {
  const [step, setStep] = useState<Step>('details');
  const [formData, setFormData] = useState<CenterFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof CenterFormData, string>>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const [generatedCenterCode, setGeneratedCenterCode] = useState('');
  const [showReferralGate, setShowReferralGate] = useState(false);

  const idProofRef = useRef<HTMLInputElement>(null);
  const userPhotoRef = useRef<HTMLInputElement>(null);

  const paymentScreenshotRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const { setCenter } = useAuthStore();

  useEffect(() => {
    console.log("NSEP Debug - Form Data Updated:", formData);
  }, [formData]);

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (!refCode) {
      setShowReferralGate(true);
    } else {
      setShowReferralGate(false);
    }
  }, [searchParams]);

  const steps: { key: Step; label: string; labelHi: string; icon: typeof Building2 }[] = [
    { key: 'details', label: 'Center Details', labelHi: 'केंद्र विवरण', icon: Building2 },
    { key: 'owner', label: 'Owner Info', labelHi: 'स्वामी जानकारी', icon: User },
    { key: 'payment', label: 'Payment', labelHi: 'भुगतान', icon: Gift },
    { key: 'address', label: 'Address', labelHi: 'पता', icon: MapPin },
    { key: 'documents', label: 'Documents', labelHi: 'दस्तावेज़', icon: FileText },
    { key: 'review', label: 'Review', labelHi: 'समीक्षा', icon: CheckCircle },
  ];

  const currentStepIndex = step === 'success' ? steps.length : steps.findIndex((s) => s.key === step);

  const updateField = (field: keyof CenterFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateDetailsStep = (): boolean => {
    const newErrors: Partial<Record<keyof CenterFormData, string>> = {};
    if (!formData.centerName.trim()) newErrors.centerName = 'Center name is required';
    if (!formData.centerType) newErrors.centerType = 'Center type is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateOwnerStep = (): boolean => {
    const newErrors: Partial<Record<keyof CenterFormData, string>> = {};
    if (!formData.ownerName.trim()) newErrors.ownerName = 'Owner name is required';
    if (!formData.ownerPhone.trim()) {
      newErrors.ownerPhone = 'Phone is required';
    } else if (!isValidMobile(formData.ownerPhone)) {
      newErrors.ownerPhone = 'Invalid phone number';
    }
    if (!formData.ownerEmail.trim()) {
      newErrors.ownerEmail = 'Email is required';
    } else if (!isValidEmail(formData.ownerEmail)) {
      newErrors.ownerEmail = 'Invalid email format';
    }
    if (!formData.ownerAadhaar.trim()) {
      newErrors.ownerAadhaar = 'Aadhaar number is required';
    } else if (formData.ownerAadhaar.length !== 12) {
      newErrors.ownerAadhaar = 'Aadhaar must be 12 digits';
    }
    if (!formData.password?.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePaymentStep = (): boolean => {
    const newErrors: Partial<Record<keyof CenterFormData, string>> = {};
    if (!formData.transactionId.trim()) newErrors.transactionId = 'Transaction ID is required';
    if (!formData.paymentScreenshotUrl) newErrors.paymentScreenshotUrl = 'Payment screenshot is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateAddressStep = (): boolean => {
    const newErrors: Partial<Record<keyof CenterFormData, string>> = {};
    if (!formData.fullAddress.trim()) newErrors.fullAddress = 'Address is required';
    if (!formData.village.trim()) newErrors.village = 'Village/Town is required';
    if (!formData.block.trim()) newErrors.block = 'Block is required';
    if (!formData.district.trim()) newErrors.district = 'District is required';
    if (!formData.state) newErrors.state = 'State is required';
    if (!formData.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (formData.pincode.length !== 6) {
      newErrors.pincode = 'Pincode must be 6 digits';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDocumentsStep = (): boolean => {
    const newErrors: Partial<Record<keyof CenterFormData, string>> = {};
    if (!formData.idProofUrl) newErrors.idProofUrl = 'ID Proof is required';
    if (!formData.userPhotoUrl) newErrors.userPhotoUrl = 'User Photo is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 'details' && validateDetailsStep()) setStep('owner');
    else if (step === 'owner' && validateOwnerStep()) setStep('payment');
    else if (step === 'payment' && validatePaymentStep()) setStep('address');
    else if (step === 'address' && validateAddressStep()) setStep('documents');
    else if (step === 'documents' && validateDocumentsStep()) setStep('review');
  };

  const handleBack = () => {
    if (step === 'owner') setStep('details');
    else if (step === 'payment') setStep('owner');
    else if (step === 'address') setStep('payment');
    else if (step === 'documents') setStep('address');
    else if (step === 'review') setStep('documents');
  };

  const handleSubmit = async () => {
    if (!termsAccepted) {
      setTermsError('You must accept the terms and conditions');
      return;
    }

    setIsSubmitting(true);
    // Removed artificial delay for snappy UX

    const centerCode = generateCenterCode();
    console.log("NSEP Debug - Generated Center Code:", centerCode);

    // Create center record
    const center = {
      id: generateUUID(),
      name: formData.centerName,
      centerType: formData.centerType,
      ownerName: formData.ownerName,
      ownerEmail: formData.ownerEmail,
      ownerPhone: formData.ownerPhone,
      ownerAadhaar: formData.ownerAadhaar,
      address: formData.fullAddress,
      village: formData.village,
      block: formData.block,
      district: formData.district,
      state: formData.state,
      pincode: formData.pincode,
      centerCode,
      status: 'PENDING',
      totalStudents: 0,
      totalEarnings: 0,
      createdAt: new Date().toISOString(),
      idProofUrl: formData.idProofUrl,
      centerPhotoUrl: formData.userPhotoUrl,
    };
    console.log("NSEP Debug - Center Object created:", center);

    // 4. Save to backend (Real Database)
    try {
      console.log("NSEP Debug - Process started for:", formData.ownerEmail);

      // Step A: Attempt Auth SignUp (Fire and Forget if already exists)
      const { data: authData, error: authError } = await backend.auth.signUp({
        email: formData.ownerEmail,
        password: formData.password || 'password123',
        options: { data: { full_name: formData.ownerName, role: 'CENTER' } }
      });

      const userId = authData?.user?.id;
      if (authError && !authError.message?.toLowerCase().includes('already registered')) {
        console.warn("Auth signup error (non-critical):", authError.message);
      }

      // Step B: Direct Insert attempt (using user's schema column names)
      const centerData = {
        center_name: center.name,
        center_type: center.centerType,
        owner_name: center.ownerName,
        owner_mobile: center.ownerPhone,
        owner_email: center.ownerEmail,
        center_address: center.address,
        village: center.village,
        block: center.block,
        district: center.district,
        state: center.state,
        pincode: center.pincode,
        id_proof_url: center.idProofUrl,
        center_code: center.centerCode,
        status: 'PENDING',
      };

      const { error: insertError } = await backend.from('centers').insert([centerData]);

      if (insertError) {
        // If it's a duplicate, it's actually a success for the user
        if (insertError.message.toLowerCase().includes('duplicate') || insertError.code === '23505') {
          console.log("Duplicate detected, fetching existing code...");
          const { data: existing } = await backend
            .from('centers')
            .select('center_code')
            .eq('owner_email', formData.ownerEmail)
            .maybeSingle();

          if (existing) {
            setGeneratedCenterCode(existing.center_code);
            setStep('success');
            setIsSubmitting(false);
            return;
          }
        }
        throw insertError;
      }

      // Step C: Create referral code record in DB so center can start referring immediately
      try {
        console.log("NSEP Debug - Creating referral code for:", center.centerCode);
        await backend.from('referral_codes').insert([{
          code: center.centerCode,
          type: 'CENTER_CODE',
          owner_id: center.id,
          owner_name: center.name,
          reward_amount: REFERRAL_CONFIG.centerCodeReward,
          is_active: true,
          total_referrals: 0,
          total_earnings: 0,
        }]);
      } catch (refErr) {
        console.warn("Auto-referral code creation failed (non-critical):", refErr);
      }

      // Step D: Success - Auto-login and redirect to dashboard
      console.log("Registration successful, auto-login and redirect...");
      setGeneratedCenterCode(center.centerCode);

      // Auto-login the center and redirect to dashboard
      try {
        // Sign in with the registered credentials
        const { data: signInData, error: signInError } = await backend.auth.signInWithPassword({
          email: formData.ownerEmail,
          password: formData.password || 'password123',
        });

        if (signInError) {
          console.warn("Auto-login failed, redirecting without session:", signInError.message);
        } else {
          // Fetch the center data to set in store
          const { data: centerData, error: fetchError } = await backend
            .from('centers')
            .select('*')
            .eq('center_code', center.centerCode)
            .single();

          if (!fetchError && centerData) {
            // Map center data to the expected format
            const mappedCenter = {
              id: centerData.id,
              userId: centerData.user_id,
              name: centerData.center_name,
              centerType: centerData.center_type,
              ownerName: centerData.owner_name,
              ownerPhone: centerData.owner_mobile,
              ownerEmail: centerData.owner_email,
              ownerAadhaar: centerData.owner_aadhaar,
              address: centerData.center_address,
              village: centerData.village,
              block: centerData.block,
              state: centerData.state,
              district: centerData.district,
              pincode: centerData.pincode,
              centerCode: centerData.center_code,
              status: centerData.status,
              idProofUrl: centerData.id_proof_url,
              addressProofUrl: centerData.address_proof_url,
              centerPhotoUrl: centerData.center_photo_url,
              approvedBy: centerData.approved_by,
              approvedAt: centerData.approved_at,
              rejectionReason: centerData.rejection_reason,
              totalStudents: centerData.total_students || 0,
              totalEarnings: Number(centerData.total_earnings || 0),
              createdAt: centerData.created_at,
            };

            // Set the center in the auth store
            setCenter(mappedCenter);
            console.log("Center session created successfully");
          }
        }
      } catch (loginErr) {
        console.warn("Auto-login error:", loginErr);
      }

      // Redirect to dashboard
      navigate('/center-dashboard');
    } catch (err) {
      console.error('Final Registration Catch:', err);

      // Attempt recovery one last time before showing error
      const { data: finalCheck } = await backend
        .from('centers')
        .select('center_code')
        .eq('owner_email', formData.ownerEmail)
        .maybeSingle();

      if (finalCheck) {
        setGeneratedCenterCode(finalCheck.center_code);
        setStep('success');
      } else {
        const errorMsg = err instanceof Error ? err.message : 'Please contact support if you are unable to register.';
        toast({
          title: 'Registration Update',
          description: errorMsg,
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = (ref: React.RefObject<HTMLInputElement>) => {
    ref.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, field: keyof CenterFormData) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB after compression, but warn if extremely large before)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }

    const compressToast = toast({
      title: "Processing Document",
      description: "Optimizing image for upload...",
    });

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        // Auto-compress to under 2MB
        const compressedBase64 = await compressImage(file, 2);

        // Convert base64 to File for upload
        const res = await fetch(compressedBase64);
        const blob = await res.blob();
        const fileExt = file.name.split('.').pop() || 'jpg';
        const compressedFile = new File([blob], file.name, { type: blob.type || 'image/jpeg' });

        // Upload to center-documents bucket
        const fileName = `center-${field}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await backend.storage
          .from('center-documents')
          .upload(fileName, compressedFile, { contentType: compressedFile.type });

        if (uploadError) throw uploadError;

        const { data } = backend.storage
          .from('center-documents')
          .getPublicUrl(fileName);

        const publicUrl = data?.publicUrl || '';

        setFormData(prev => ({
          ...prev,
          [field]: publicUrl,
          [`${field}Name`]: file.name
        }));

        compressToast.dismiss();
        toast({
          title: language === 'hi' ? 'दस्तावेज़ चुना गया' : 'Document Uploaded',
          description: file.name,
        });
      } catch (error) {
        console.error('Upload error:', error);
        compressToast.dismiss();
        toast({
          title: "Error",
          description: "Failed to process image.",
          variant: "destructive"
        });
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const removeFile = (field: keyof CenterFormData) => {
    setFormData(prev => ({
      ...prev,
      [field]: '',
      [`${field}Name`]: undefined
    }));
  };

  if (showReferralGate) {
    return (
      <div className="min-h-screen bg-muted py-8 px-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <Card className="text-center py-12 px-6 border-2 border-primary/20 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Gift className="size-32" />
            </div>
            <CardHeader className="relative z-10">
              <div className="mx-auto size-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Users className="size-10 text-primary" />
              </div>
              <CardTitle className="font-serif text-2xl mb-2">
                {language === 'hi' ? 'केवल रेफ़रल द्वारा पंजीकरण' : 'Registration by Referral Only'}
              </CardTitle>
              <CardDescription className="text-base leading-relaxed">
                {language === 'hi'
                  ? 'केंद्र पंजीकरण वर्तमान में केवल आधिकारिक रेफ़रल के माध्यम से उपलब्ध है।'
                  : 'Center registration is currently restricted to referrals from authorized partners or admins.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="p-4 bg-muted rounded-xl space-y-2 text-left">
                <p className="text-sm font-semibold text-foreground italic">
                  {language === 'hi' ? 'रेफ़रल कोड दर्ज करें:' : 'Enter your referral code:'}
                </p>
                <div className="flex gap-2">
                  <Input
                    id="center-ref-input"
                    className="uppercase font-mono text-center tracking-widest h-11"
                    placeholder="CODE"
                  />
                  <Button
                    variant="default"
                    className="institutional-gradient px-6"
                    onClick={() => {
                      const val = (document.getElementById('center-ref-input') as HTMLInputElement).value;
                      if (val) {
                        navigate(`/center-registration?ref=${val.trim().toUpperCase()}`);
                      }
                    }}
                  >
                    OK
                  </Button>
                </div>
              </div>

              <div className="pt-4">
                <Button variant="ghost" asChild>
                  <Link to="/" className="text-muted-foreground">
                    <ArrowLeft className="size-4 mr-2" />
                    {language === 'hi' ? 'मुखपृष्ठ पर वापस' : 'Back to Homepage'}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-primary mb-4">
            <img src={logoImg} alt="GPHDM" className="h-10 w-auto" />
            <span className="font-serif text-xl font-bold">{APP_CONFIG.shortName}</span>
          </Link>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            {language === 'hi' ? 'केंद्र पंजीकरण' : 'Center Registration'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'hi'
              ? 'अनुमोदित परीक्षा केंद्र बनने के लिए आवेदन करें'
              : 'Apply to become an approved examination center'}
          </p>
        </div>

        {/* Benefits Banner */}
        <Card className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="size-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="size-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-orange-800">
                  {language === 'hi' ? 'केंद्र लाभ' : 'Center Benefits'}
                </h3>
                <ul className="text-sm text-orange-700 mt-2 space-y-1">
                  <li>• {language === 'hi' ? `प्रति सफल पंजीकरण ${formatCurrency(REFERRAL_CONFIG.centerCodeReward)} कमाएं` : `Earn ${formatCurrency(REFERRAL_CONFIG.centerCodeReward)} per successful registration`}</li>
                  <li>• {language === 'hi' ? 'अपना यूनिक सेंटर कोड प्राप्त करें' : 'Get your unique Center Code'}</li>
                  <li>• {language === 'hi' ? 'रियल-टाइम डैशबोर्ड एक्सेस' : 'Real-time dashboard access'}</li>
                  <li>• {language === 'hi' ? 'प्राथमिकता समर्थन' : 'Priority support'}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((s, index) => (
              <div key={s.key} className="flex-1 flex items-center">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`size-10 rounded-full flex items-center justify-center transition-colors ${index < currentStepIndex
                      ? 'bg-green-600 text-white'
                      : index === currentStepIndex
                        ? 'bg-primary text-white'
                        : 'bg-muted-foreground/20 text-muted-foreground'
                      }`}
                  >
                    {index < currentStepIndex ? <CheckCircle className="size-5" /> : <s.icon className="size-5" />}
                  </div>
                  <div className="mt-2 text-center hidden sm:block">
                    <div className={`text-xs font-medium ${index <= currentStepIndex ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {language === 'hi' ? s.labelHi : s.label}
                    </div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 w-full mx-2 ${index < currentStepIndex ? 'bg-green-600' : 'bg-border'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const currentStep = steps[currentStepIndex];
                if (!currentStep) {
                  if (step === 'success') {
                    return (
                      <>
                        <CheckCircle className="size-5 text-green-600" />
                        {language === 'hi' ? 'पंजीकरण सफल' : 'Registration Successful'}
                      </>
                    );
                  }
                  return null;
                }
                const StepIcon = currentStep.icon;
                return (
                  <>
                    <StepIcon className="size-5" />
                    {language === 'hi' ? currentStep.labelHi : currentStep.label}
                  </>
                );
              })()}
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[70vh] sm:max-h-[75vh] md:max-h-[80vh] overflow-y-auto custom-scrollbar pr-2">
            {/* Details Step */}
            {step === 'details' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="centerName">
                    {language === 'hi' ? 'केंद्र का नाम' : 'Center Name'} *
                  </Label>
                  <Input
                    id="centerName"
                    value={formData.centerName}
                    onChange={(e) => updateField('centerName', e.target.value)}
                    placeholder={language === 'hi' ? 'अपने केंद्र का नाम दर्ज करें' : 'Enter your center name'}
                    className={errors.centerName ? 'border-destructive' : ''}
                  />
                  {errors.centerName && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="size-3" /> {errors.centerName}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="centerType">
                    {language === 'hi' ? 'केंद्र का प्रकार' : 'Center Type'} *
                  </Label>
                  <Select value={formData.centerType} onValueChange={(v) => updateField('centerType', v)}>
                    <SelectTrigger className={errors.centerType ? 'border-destructive' : ''}>
                      <SelectValue placeholder={language === 'hi' ? 'प्रकार चुनें' : 'Select type'} />
                    </SelectTrigger>
                    <SelectContent>
                      {centerTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.centerType && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="size-3" /> {errors.centerType}
                    </p>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">
                    {language === 'hi' ? 'पात्रता मानदंड' : 'Eligibility Criteria'}
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• {language === 'hi' ? 'वैध पहचान प्रमाण आवश्यक' : 'Valid ID proof required'}</li>
                    <li>• {language === 'hi' ? 'स्थायी केंद्र पता' : 'Permanent center address'}</li>
                    <li>• {language === 'hi' ? 'कम से कम 10 छात्रों को रेफर करने की क्षमता' : 'Ability to refer at least 10 students'}</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Owner Step */}
            {step === 'owner' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ownerName">
                    {language === 'hi' ? 'स्वामी का नाम' : 'Owner Full Name'} *
                  </Label>
                  <Input
                    id="ownerName"
                    value={formData.ownerName}
                    onChange={(e) => updateField('ownerName', e.target.value)}
                    placeholder={language === 'hi' ? 'पूरा नाम दर्ज करें' : 'Enter full name'}
                    className={errors.ownerName ? 'border-destructive' : ''}
                  />
                  {errors.ownerName && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="size-3" /> {errors.ownerName}
                    </p>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ownerPhone">
                      <Phone className="size-4 inline mr-1" />
                      {language === 'hi' ? 'फोन नंबर' : 'Phone Number'} *
                    </Label>
                    <Input
                      id="ownerPhone"
                      value={formData.ownerPhone}
                      onChange={(e) => updateField('ownerPhone', e.target.value.replace(/\D/g, ''))}
                      placeholder="10-digit mobile"
                      maxLength={10}
                      className={errors.ownerPhone ? 'border-destructive' : ''}
                    />
                    {errors.ownerPhone && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="size-3" /> {errors.ownerPhone}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerEmail">
                      <Mail className="size-4 inline mr-1" />
                      {language === 'hi' ? 'ईमेल' : 'Email'} *
                    </Label>
                    <Input
                      id="ownerEmail"
                      type="email"
                      value={formData.ownerEmail}
                      onChange={(e) => updateField('ownerEmail', e.target.value)}
                      placeholder="email@example.com"
                      autoComplete="off"
                      className={errors.ownerEmail ? 'border-destructive' : ''}
                    />
                    {errors.ownerEmail && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="size-3" /> {errors.ownerEmail}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ownerAadhaar">
                    {language === 'hi' ? 'आधार नंबर' : 'Aadhaar Number'} *
                  </Label>
                  <Input
                    id="ownerAadhaar"
                    value={formData.ownerAadhaar}
                    onChange={(e) => updateField('ownerAadhaar', e.target.value.replace(/\D/g, ''))}
                    placeholder="12-digit Aadhaar"
                    maxLength={12}
                    className={errors.ownerAadhaar ? 'border-destructive' : ''}
                  />
                  {errors.ownerAadhaar && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="size-3" /> {errors.ownerAadhaar}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {language === 'hi' ? 'सत्यापन और KYC के लिए आवश्यक' : 'Required for verification and KYC'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">
                    {language === 'hi' ? 'पासवर्ड सेट करें' : 'Set Password'} *
                  </Label>
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
            )}

            {/* Payment Step */}
            {step === 'payment' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-center">
                  <h3 className="text-xl font-bold text-primary mb-2">
                    {language === 'hi' ? 'पंजीकरण शुल्क: ₹500' : 'Registration Fee: ₹500'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {language === 'hi'
                      ? 'पार्टनर बनने के लिए कृपया नीचे दिए गए QR कोड को स्कैन करके ₹500 का भुगतान करें।'
                      : 'Please scan the QR code below to pay ₹500 to become a partner.'}
                  </p>

                  <div className="max-w-[280px] mx-auto bg-white p-4 rounded-2xl shadow-xl border-4 border-primary/10 mb-6">
                    {/* QR Code Placeholder - User will replace this or I will provide asset */}
                    <div className="aspect-square bg-muted flex items-center justify-center rounded-lg overflow-hidden relative group">
                      <img
                        src="/qr-code-placeholder.png"
                        alt="Payment QR Code"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=Vyapar.175692887286@hdfcbank&pn=GRAM%20PANCHAYAT%20HELP%20DESK%20MISSION&am=500&cu=INR";
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white text-xs font-bold px-4 text-center">Scan with GPay, PhonePe or any UPI app</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-dashed">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">UPI ID</p>
                      <p className="text-sm font-mono font-bold text-primary">Vyapar.175692887286@hdfcbank</p>
                    </div>
                  </div>

                  <div className="grid gap-4 text-left">
                    <div className="space-y-2">
                      <Label htmlFor="transactionId">
                        {language === 'hi' ? 'ट्रांजैक्शन ID' : 'Transaction / UTR ID'} *
                      </Label>
                      <Input
                        id="transactionId"
                        value={formData.transactionId}
                        onChange={(e) => updateField('transactionId', e.target.value)}
                        placeholder="Enter 12-digit Transaction ID"
                        className={errors.transactionId ? 'border-destructive' : ''}
                      />
                      {errors.transactionId && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="size-3" /> {errors.transactionId}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>{language === 'hi' ? 'पेमेंट स्क्रीनशॉट' : 'Payment Screenshot'} *</Label>
                      <input
                        type="file"
                        ref={paymentScreenshotRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'paymentScreenshotUrl')}
                      />
                      <div
                        onClick={() => paymentScreenshotRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all hover:bg-primary/5 flex flex-col items-center justify-center gap-2 ${errors.paymentScreenshotUrl ? 'border-destructive bg-destructive/5' : 'border-muted-foreground/20'}`}
                      >
                        {formData.paymentScreenshotUrl ? (
                          <div className="flex items-center gap-3 w-full">
                            <div className="size-16 rounded bg-white border p-1">
                              <img src={formData.paymentScreenshotUrl} alt="Screenshot" className="w-full h-full object-cover rounded shadow-sm" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <p className="text-xs font-bold truncate">{formData.paymentScreenshotName || 'Screenshot uploaded'}</p>
                              <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest mt-0.5">File Ready ✓</p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile('paymentScreenshotUrl');
                              }}
                            >
                              ×
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Upload className="size-5 text-primary" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-bold">{language === 'hi' ? 'स्क्रीनशॉट अपलोड करें' : 'Upload Screenshot'}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-tighter">Images only (JPG, PNG)</p>
                            </div>
                          </>
                        )}
                      </div>
                      {errors.paymentScreenshotUrl && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="size-3" /> {errors.paymentScreenshotUrl}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-left">
                      <p className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-1">
                        {language === 'hi' ? 'महत्वपूर्ण सूचना' : 'Important Notice'}
                      </p>
                      <p className="text-xs text-amber-700 leading-relaxed font-medium">
                        {language === 'hi'
                          ? 'भुगतान के बाद आपके आवेदन को सुपर एडमिन द्वारा सत्यापित किया जाएगा। इस प्रक्रिया में 24 घंटे तक का समय लग सकता है। अनुमोदन के बाद ही आपका सेंटर कोड सक्रिय होगा।'
                          : 'After payment, your application will be verified by the Super Admin. This process can take up to 24 hours. Your Center Code will be activated only after approval.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Address Step */}
            {step === 'address' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullAddress">
                    {language === 'hi' ? 'पूरा पता' : 'Full Address'} *
                  </Label>
                  <Textarea
                    id="fullAddress"
                    value={formData.fullAddress}
                    onChange={(e) => updateField('fullAddress', e.target.value)}
                    placeholder={language === 'hi' ? 'केंद्र का पूरा पता' : 'Complete center address'}
                    rows={3}
                    className={errors.fullAddress ? 'border-destructive' : ''}
                  />
                  {errors.fullAddress && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="size-3" /> {errors.fullAddress}
                    </p>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="village">{language === 'hi' ? 'गांव/शहर' : 'Village/Town'} *</Label>
                    <Input
                      id="village"
                      value={formData.village}
                      onChange={(e) => updateField('village', e.target.value)}
                      className={errors.village ? 'border-destructive' : ''}
                    />
                    {errors.village && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="size-3" /> {errors.village}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="block">{language === 'hi' ? 'ब्लॉक' : 'Block'} *</Label>
                    <Input
                      id="block"
                      value={formData.block}
                      onChange={(e) => updateField('block', e.target.value)}
                      className={errors.block ? 'border-destructive' : ''}
                    />
                    {errors.block && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="size-3" /> {errors.block}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="district">{language === 'hi' ? 'जिला' : 'District'} *</Label>
                    <Input
                      id="district"
                      value={formData.district}
                      onChange={(e) => updateField('district', e.target.value)}
                      className={errors.district ? 'border-destructive' : ''}
                    />
                    {errors.district && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="size-3" /> {errors.district}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode">{language === 'hi' ? 'पिनकोड' : 'Pincode'} *</Label>
                    <Input
                      id="pincode"
                      value={formData.pincode}
                      onChange={(e) => updateField('pincode', e.target.value.replace(/\D/g, ''))}
                      maxLength={6}
                      className={errors.pincode ? 'border-destructive' : ''}
                    />
                    {errors.pincode && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="size-3" /> {errors.pincode}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">{language === 'hi' ? 'राज्य' : 'State'} *</Label>
                  <Select value={formData.state} onValueChange={(v) => updateField('state', v)}>
                    <SelectTrigger className={errors.state ? 'border-destructive' : ''}>
                      <SelectValue placeholder={language === 'hi' ? 'राज्य चुनें' : 'Select state'} />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.state && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="size-3" /> {errors.state}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Documents Step */}
            {step === 'documents' && (
              <div className="space-y-6">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-orange-800">
                    {language === 'hi'
                      ? 'दस्तावेज़ अपलोड वैकल्पिक है लेकिन तेज़ अनुमोदन के लिए अनुशंसित है।'
                      : 'Document upload is optional but recommended for faster approval.'}
                  </p>
                </div>

                <div className="grid gap-4">
                  {/* Hidden Inputs */}
                  <input
                    type="file"
                    ref={idProofRef}
                    className="hidden"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(e, 'idProofUrl')}
                  />
                  <input
                    type="file"
                    ref={userPhotoRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'userPhotoUrl')}
                  />

                  {/* ID Proof */}
                  <div className={`border-2 border-dashed rounded-lg p-4 transition-colors ${errors.idProofUrl ? 'border-destructive/50 bg-red-50/10' : 'hover:border-primary/50'}`}>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{language === 'hi' ? 'पहचान प्रमाण' : 'ID Proof'} *</h4>
                          <p className="text-sm text-muted-foreground">
                            {language === 'hi' ? 'आधार/पैन/वोटर ID' : 'Aadhaar/PAN/Voter ID'}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={formData.idProofUrl ? "secondary" : "outline"}
                          onClick={() => handleFileSelect(idProofRef)}
                        >
                          <Upload className="size-4 mr-2" />
                          {formData.idProofUrl
                            ? (language === 'hi' ? 'बदलें' : 'Change')
                            : (language === 'hi' ? 'अपलोड करें' : 'Upload')}
                        </Button>
                      </div>

                      {formData.idProofUrl && (
                        <div className="flex items-center gap-3 p-2 bg-green-50/50 rounded-md border border-green-100">
                          <div className="size-12 rounded border bg-white overflow-hidden flex-shrink-0">
                            <img src={formData.idProofUrl} alt="ID Preview" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-green-800 truncate">
                              {formData.idProofName || (language === 'hi' ? 'दस्तावेज़ चुना गया' : 'Document selected')}
                            </p>
                            <p className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                              <CheckCircle className="size-3" />
                              {language === 'hi' ? 'अपलोड किया गया' : 'Uploaded'}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                            onClick={() => removeFile('idProofUrl')}
                          >
                            ×
                          </Button>
                        </div>
                      )}
                      {errors.idProofUrl && <p className="text-xs text-destructive">{errors.idProofUrl}</p>}
                    </div>
                  </div>

                  {/* User Photo */}
                  <div className={`border-2 border-dashed rounded-lg p-4 transition-colors ${errors.userPhotoUrl ? 'border-destructive/50 bg-red-50/10' : 'hover:border-primary/50'}`}>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{language === 'hi' ? 'उपयोगकर्ता फोटो' : 'User Photo'} *</h4>
                          <p className="text-sm text-muted-foreground">
                            {language === 'hi' ? 'उपयोगकर्ता की तस्वीर' : 'Recent passport size photo'}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={formData.userPhotoUrl ? "secondary" : "outline"}
                          onClick={() => handleFileSelect(userPhotoRef)}
                        >
                          <Camera className="size-4 mr-2" />
                          {formData.userPhotoUrl
                            ? (language === 'hi' ? 'बदलें' : 'Change')
                            : (language === 'hi' ? 'अपलोड करें' : 'Upload')}
                        </Button>
                      </div>

                      {formData.userPhotoUrl && (
                        <div className="flex items-center gap-3 p-2 bg-green-50/50 rounded-md border border-green-100">
                          <div className="size-12 rounded border bg-white overflow-hidden flex-shrink-0">
                            <img src={formData.userPhotoUrl} alt="User Preview" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-green-800 truncate">
                              {formData.userPhotoName || (language === 'hi' ? 'फोटो चुनी गई' : 'Photo selected')}
                            </p>
                            <p className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                              <CheckCircle className="size-3" />
                              {language === 'hi' ? 'अपलोड किया गया' : 'Uploaded'}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                            onClick={() => removeFile('userPhotoUrl')}
                          >
                            ×
                          </Button>
                        </div>
                      )}
                      {errors.userPhotoUrl && <p className="text-xs text-destructive">{errors.userPhotoUrl}</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Review Step */}
            {step === 'review' && (
              <div className="space-y-6">
                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Building2 className="size-4" />
                    {language === 'hi' ? 'केंद्र विवरण' : 'Center Details'}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">{language === 'hi' ? 'नाम:' : 'Name:'}</span>
                    <span>{formData.centerName}</span>
                    <span className="text-muted-foreground">{language === 'hi' ? 'प्रकार:' : 'Type:'}</span>
                    <span>{formData.centerType}</span>
                  </div>
                </div>

                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="size-4" />
                    {language === 'hi' ? 'स्वामी जानकारी' : 'Owner Information'}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">{language === 'hi' ? 'नाम:' : 'Name:'}</span>
                    <span>{formData.ownerName}</span>
                    <span className="text-muted-foreground">{language === 'hi' ? 'फोन:' : 'Phone:'}</span>
                    <span>{formData.ownerPhone}</span>
                    <span className="text-muted-foreground">{language === 'hi' ? 'ईमेल:' : 'Email:'}</span>
                    <span>{formData.ownerEmail}</span>
                  </div>
                </div>

                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MapPin className="size-4" />
                    {language === 'hi' ? 'पता' : 'Address'}
                  </h3>
                  <p className="text-sm">
                    {formData.fullAddress}, {formData.village}, {formData.block}, {formData.district}, {formData.state} - {formData.pincode}
                  </p>
                </div>

                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Gift className="size-4" />
                    {language === 'hi' ? 'भुगतान विवरण' : 'Payment Details'}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">{language === 'hi' ? 'ट्रांजैक्शन ID:' : 'Transaction ID:'}</span>
                    <span className="font-mono">{formData.transactionId}</span>
                    <span className="text-muted-foreground">{language === 'hi' ? 'स्क्रीनशॉट:' : 'Screenshot:'}</span>
                    <span className="text-green-600 font-bold">{formData.paymentScreenshotUrl ? '✓ Uploaded' : '—'}</span>
                  </div>
                </div>

                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="size-4" />
                    {language === 'hi' ? 'दस्तावेज़' : 'Documents'}
                  </h3>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className={`px-2 py-1 rounded ${formData.idProofUrl ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {language === 'hi' ? 'पहचान प्रमाण' : 'ID Proof'}: {formData.idProofUrl ? '✓' : '—'}
                    </span>
                    <span className={`px-2 py-1 rounded ${formData.userPhotoUrl ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {language === 'hi' ? 'उपयोगकर्ता फोटो' : 'User Photo'}: {formData.userPhotoUrl ? '✓' : '—'}
                    </span>
                  </div>
                </div>

                {/* Terms Checkbox */}
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => {
                      setTermsAccepted(!!checked);
                      setTermsError('');
                    }}
                  />
                  <div className="flex-1">
                    <Label htmlFor="terms" className="cursor-pointer">
                      {language === 'hi'
                        ? 'मैं केंद्र साझेदारी नियम और शर्तों से सहमत हूं'
                        : 'I agree to the Center Partnership Terms and Conditions'}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {language === 'hi'
                        ? 'इसमें रेफरल नीतियां, भुगतान शर्तें और आचार संहिता शामिल है।'
                        : 'This includes referral policies, payment terms, and code of conduct.'}
                    </p>
                  </div>
                </div>
                {termsError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="size-4" /> {termsError}
                  </p>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-4">
                  {step !== 'details' && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      className="px-6"
                    >
                      <ArrowLeft className="size-4 mr-2" />
                      Back
                    </Button>
                  )}
                  <div className="flex-1" />
                  {step !== 'review' ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="px-6 institutional-gradient"
                    >
                      Next
                      <ArrowRight className="size-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting || !termsAccepted}
                      className="px-6 institutional-gradient"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit Application
                          <CheckCircle className="size-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      </div>

      {/* Success View (Modal) */}
      <Dialog open={step === 'success'} onOpenChange={(open) => { if (!open) navigate('/center/dashboard'); }}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-[2rem] bg-white">
          <div className="bg-gradient-to-b from-green-50 to-white p-8">
            <DialogHeader className="text-center pt-4">
              <div className="mx-auto size-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-100/50 animate-bounce">
                <CheckCircle className="size-12 text-green-600" />
              </div>
              <DialogTitle className="text-3xl font-black text-green-800 text-center">
                {language === 'hi' ? 'बधाई हो!' : 'Congratulations!'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-center text-base font-medium mt-2">
                {language === 'hi'
                  ? 'आपका केंद्र सफलतापूर्वक पंजीकृत हो गया है।'
                  : 'Your center has been successfully registered.'}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-8 space-y-6">
              <div className="bg-white p-8 rounded-3xl border-2 border-dashed border-green-200 shadow-inner text-center">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3">
                  {language === 'hi' ? 'आपका यूनिक केंद्र कोड' : 'YOUR UNIQUE CENTER CODE'}
                </p>
                <div className="flex items-center justify-center gap-4">
                  <span className="text-4xl font-mono font-black text-primary tracking-tighter">
                    {generatedCenterCode || 'PENDING'}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="hover:bg-primary/10 hover:text-primary transition-all rounded-full h-12 w-12"
                    onClick={() => {
                      if (generatedCenterCode) {
                        navigator.clipboard.writeText(generatedCenterCode);
                        toast({ title: "Copied! 📋", description: "Center code copied to clipboard" });
                      }
                    }}
                  >
                    <Copy className="size-6" />
                  </Button>
                </div>
              </div>

              <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100">
                <p className="text-xs text-amber-800 flex gap-3 leading-relaxed">
                  <Clock className="size-5 text-amber-500 shrink-0" />
                  <span>
                    {language === 'hi'
                      ? 'आवेदन की वर्तमान में समीक्षा की जा रही है। अनुमोदन के बाद आपका डैशबोर्ड सक्रिय हो जाएगा।'
                      : 'Your application is under review. Your dashboard will be activated once approved.'}
                  </span>
                </p>
              </div>

              <Button
                className="w-full h-16 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-black text-lg shadow-xl hover:scale-[1.02] transition-transform"
                onClick={() => navigate('/center/dashboard')}
              >
                {language === 'hi' ? 'डैशबोर्ड पर जाएं' : 'Go to Dashboard'}
                <ArrowRight className="ml-2 size-5" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
