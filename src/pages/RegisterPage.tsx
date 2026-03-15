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
import { useToast } from '@/hooks/use-toast';
import { useStudentStore, useAuthStore, useReferralStore } from '@/stores';
import { CLASSES, INDIAN_STATES, getExamFee, APP_CONFIG } from '@/constants/config';
import { isValidEmail, isValidMobile, formatCurrency, compressImage } from '@/lib/utils';
import { STATE_DISTRICTS } from '@/constants/districts';
import { client as backend } from '@/lib/backend';
import { useLanguage } from '@/contexts/LanguageContext';

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

const initialConsentData: ConsentData = {
  termsAccepted: false,
  privacyAccepted: false,
  referralPolicyAccepted: false,
};

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;
// Allowed image types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function RegisterPage() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [consentData, setConsentData] = useState<ConsentData>(initialConsentData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [consentError, setConsentError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referralInfo, setReferralInfo] = useState<{ type: string; ownerName: string } | null>(null);
  const [referralType, setReferralType] = useState<'CENTER' | 'STUDENT' | null>(null);
  const [searchParams] = useSearchParams();
  const [showReferralGate, setShowReferralGate] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addStudent } = useStudentStore();
  const { currentStudent } = useAuthStore();
  const { referralCodes, loadReferralData } = useReferralStore();

  useEffect(() => {
    loadReferralData();
  }, [loadReferralData]);

  // Handle referral code from URL
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (!refCode && !currentStudent) {
      setShowReferralGate(true);
      return;
    }
    setShowReferralGate(false);
    if (refCode) {
      const code = refCode.toUpperCase().trim();
      setFormData(prev => ({ ...prev, referredByCenter: code }));
      validateReferralCode(code);
    }
  }, [searchParams, currentStudent]);

  const validateReferralCode = async (code: string) => {
    if (!code.trim()) return;
    const normalizedCode = code.trim().toUpperCase();

    if (normalizedCode === APP_CONFIG.masterReferralCode) {
      setReferralInfo({ type: 'Master Referral', ownerName: 'NSEP Organization' });
      setReferralType('CENTER');
      return;
    }

    if (normalizedCode.startsWith('STU') && normalizedCode.length >= 8) {
      setReferralInfo({ type: 'Student Referral', ownerName: 'Fellow Student' });
      setReferralType('STUDENT');
      return;
    }

    const referralCode = referralCodes.find((r: any) => r.code === code && r.isActive);
    if (referralCode) {
      setReferralInfo({
        type: referralCode.type === 'ADMIN_CENTER' ? 'Admin Referral' : 'Center Referral',
        ownerName: referralCode.ownerName,
      });
      setReferralType('CENTER');
      return;
    }

    if (normalizedCode.startsWith('CC') && normalizedCode.length >= 6) {
      setReferralInfo({ type: 'Center Code', ownerName: 'Authorized Center' });
      setReferralType('CENTER');
      return;
    }

    setReferralInfo(null);
    setReferralType(null);
  };

  const updateField = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      if (field === 'addressState') newData.addressDistrict = '';
      return newData;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = async (): Promise<boolean> => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.fatherName.trim()) newErrors.fatherName = "Father's name is required";
    if (!formData.class) newErrors.class = 'Class is required';
    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile is required';
    } else if (!isValidMobile(formData.mobile)) {
      newErrors.mobile = 'Invalid mobile number';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Invalid email';
    }

    if (!formData.password?.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Min 6 characters';
    }

    if (!formData.photoUrl) newErrors.photoUrl = 'Photo is required';
    if (!formData.schoolName.trim()) newErrors.schoolName = 'School name is required';
    if (!formData.schoolContact.trim()) newErrors.schoolContact = 'School contact is required';
    if (!formData.referredByCenter.trim()) {
      newErrors.referredByCenter = 'Referral code is required';
    } else if (!referralInfo) {
      newErrors.referredByCenter = 'Invalid code';
    }

    if (!formData.addressVillage.trim()) newErrors.addressVillage = 'Village is required';
    if (!formData.addressBlock.trim()) newErrors.addressBlock = 'Block is required';
    if (!formData.addressTahsil.trim()) newErrors.addressTahsil = 'Tahsil is required';
    if (!formData.addressDistrict.trim()) newErrors.addressDistrict = 'District is required';
    if (!formData.addressState) newErrors.addressState = 'State is required';

    if (!consentData.termsAccepted || !consentData.privacyAccepted || !consentData.referralPolicyAccepted) {
      setConsentError('Please accept all terms');
    } else {
      setConsentError('');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && !consentError;
  };

  const handleNext = async () => {
    if (!(await validateForm())) {
      toast({ title: 'Validation Error', description: 'Please fill all required fields correctly.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Pre-check: See if email is already managed by Auth (optional but helpful)
      // Since we don't want to create the user yet, we'll just carry the data.
      
      const registrationData = {
        ...formData,
        referralType,
        referredBy: formData.referredByCenter.toUpperCase(), // Map both to same field for now
      };

      toast({ title: 'Ready', description: 'Proceeding to secure payment...' });
      
      // Redirect to payment page, carrying the form data in the state
      navigate('/payment', { state: { registrationData } });

    } catch (error: any) {
      console.error('Registration Error:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({ title: "Invalid File", description: "Only JPG, PNG and WebP are allowed.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const compressedBase64 = await compressImage(file, 800);
      const res = await fetch(compressedBase64);
      const blob = await res.blob();
      const fileName = `temp_${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await backend.storage
        .from('student-photos')
        .upload(fileName, blob, { contentType: blob.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = backend.storage
        .from('student-photos')
        .getPublicUrl(fileName);

      updateField('photoUrl', publicUrl);
      toast({ title: 'Photo Uploaded ✓' });
    } catch (err) {
      toast({ title: 'Upload Failed', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  if (showReferralGate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full rounded-[2.5rem] p-8 border-border shadow-2xl text-center space-y-8">
           <div className="mx-auto size-24 bg-primary/10 rounded-[2rem] flex items-center justify-center shadow-lg">
             <Users className="size-12 text-primary" />
           </div>
           <h2 className="text-3xl font-black tracking-tight text-foreground">Referral Required</h2>
           <p className="text-muted-foreground font-bold italic">Registration is exclusively via trusted referrals to ensure NSEP integrity.</p>
           <div className="space-y-4">
             <Input 
                id="manual-ref"
                placeholder="ENTER REFERRAL CODE" 
                className="h-14 text-center font-mono tracking-widest uppercase rounded-2xl"
             />
             <Button 
                onClick={() => {
                  const code = (document.getElementById('manual-ref') as HTMLInputElement).value;
                  if (code) navigate(`/register?ref=${code.trim().toUpperCase()}`);
                }}
                className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase shadow-lg shadow-primary/20"
             >
                Verify & Continue
             </Button>
           </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <Link to="/" className="inline-flex items-center gap-3 text-primary mb-10 group bg-primary/10 px-6 py-3 rounded-full border border-primary/20 backdrop-blur-md">
            <GraduationCap className="size-8" />
            <span className="text-2xl font-black text-foreground tracking-tighter">{APP_CONFIG.shortName}</span>
          </Link>
          <h1 className="text-5xl lg:text-7xl font-black text-foreground mb-6 tracking-tight">
            Student <span className="text-primary">Registration</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto font-bold italic">
            Begin your journey towards academic excellence.
          </p>
        </div>

        <Card className="rounded-[3.5rem] border-border shadow-3xl overflow-hidden mb-20">
          <div className="p-10 lg:p-14 border-b border-border bg-secondary/20">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
                <FileText className="size-8 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-foreground tracking-tight">Registration Form</h2>
                <p className="text-muted-foreground font-bold italic">Please provide your details accurately.</p>
              </div>
            </div>
          </div>
          
          <div className="p-10 lg:p-14 space-y-12">
            {/* Section 1: Basic Info */}
            <section className="space-y-6">
              <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
                <User className="size-4" /> 01. Personal Identity
              </h3>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Student Name *</Label>
                  <Input id="name" value={formData.name} onChange={e => updateField('name', e.target.value)} placeholder="Full Name" className={errors.name ? 'border-destructive' : ''} />
                  {errors.name && <p className="text-xs text-destructive font-bold">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fatherName">Father's Name *</Label>
                  <Input id="fatherName" value={formData.fatherName} onChange={e => updateField('fatherName', e.target.value)} placeholder="Father's Name" className={errors.fatherName ? 'border-destructive' : ''} />
                  {errors.fatherName && <p className="text-xs text-destructive font-bold">{errors.fatherName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number *</Label>
                  <Input id="mobile" value={formData.mobile} onChange={e => updateField('mobile', e.target.value.replace(/\D/g, ''))} maxLength={10} placeholder="10-digit mobile" className={errors.mobile ? 'border-destructive' : ''} />
                  {errors.mobile && <p className="text-xs text-destructive font-bold">{errors.mobile}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input id="email" type="email" value={formData.email} onChange={e => updateField('email', e.target.value)} placeholder="email@example.com" className={errors.email ? 'border-destructive' : ''} />
                  {errors.email && <p className="text-xs text-destructive font-bold">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input id="password" type="password" value={formData.password} onChange={e => updateField('password', e.target.value)} placeholder="Create password" className={errors.password ? 'border-destructive' : ''} />
                  {errors.password && <p className="text-xs text-destructive font-bold">{errors.password}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class">Class *</Label>
                  <Select value={formData.class ? formData.class.toString() : ''} onValueChange={v => updateField('class', parseInt(v))}>
                    <SelectTrigger className={errors.class ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASSES.map(c => <SelectItem key={c} value={c.toString()}>Class {c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.class && <p className="text-xs text-destructive font-bold">{errors.class}</p>}
                </div>
              </div>

              {/* Photo Upload Box */}
              <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/20 flex flex-col sm:flex-row items-center gap-6">
                <div className="size-24 rounded-full border-4 border-white shadow-xl overflow-hidden bg-muted flex items-center justify-center relative group">
                  {formData.photoUrl ? (
                    <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : <Camera className="size-10 text-muted-foreground" />}
                  {isUploading && <div className="absolute inset-0 bg-background/50 flex items-center justify-center"><Loader2 className="animate-spin" /></div>}
                </div>
                <div className="space-y-4 text-center sm:text-left">
                  <div>
                    <Label className="text-base font-black">Profile Photo *</Label>
                    <p className="text-xs text-muted-foreground font-medium">Recent passport size photo required.</p>
                  </div>
                  <Input type="file" accept="image/*" className="hidden" id="photo-up" onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
                  <Button variant="outline" onClick={() => document.getElementById('photo-up')?.click()} className="rounded-xl font-bold gap-2">
                   <Upload className="size-4" /> Upload Photo
                  </Button>
                  {errors.photoUrl && <p className="text-xs text-destructive font-bold">{errors.photoUrl}</p>}
                </div>
              </div>
            </section>

            {/* Section 2: School Info */}
            <section className="space-y-6">
               <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
                <GraduationCap className="size-4" /> 02. Academic Institution
              </h3>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <Label htmlFor="schoolName">School Name *</Label>
                   <Input id="schoolName" value={formData.schoolName} onChange={e => updateField('schoolName', e.target.value)} placeholder="Complete school name" className={errors.schoolName ? 'border-destructive' : ''} />
                   {errors.schoolName && <p className="text-xs text-destructive font-bold">{errors.schoolName}</p>}
                </div>
                <div className="space-y-2">
                   <Label htmlFor="schoolContact">School Mobile *</Label>
                   <Input id="schoolContact" value={formData.schoolContact} onChange={e => updateField('schoolContact', e.target.value.replace(/\D/g, ''))} maxLength={10} placeholder="School mobile" className={errors.schoolContact ? 'border-destructive' : ''} />
                   {errors.schoolContact && <p className="text-xs text-destructive font-bold">{errors.schoolContact}</p>}
                </div>
              </div>
            </section>

             {/* Section 3: Address Info */}
             <section className="space-y-6">
               <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
                <Users className="size-4" /> 03. Residential Address
              </h3>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Select value={formData.addressState} onValueChange={v => updateField('addressState', v)}>
                    <SelectTrigger className={errors.addressState ? 'border-destructive' : ''}><SelectValue placeholder="Select State" /></SelectTrigger>
                    <SelectContent>{INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">District *</Label>
                   {formData.addressState && STATE_DISTRICTS[formData.addressState] ? (
                    <Select value={formData.addressDistrict} onValueChange={v => updateField('addressDistrict', v)}>
                      <SelectTrigger className={errors.addressDistrict ? 'border-destructive' : ''}><SelectValue placeholder="Select District" /></SelectTrigger>
                      <SelectContent>
                        {STATE_DISTRICTS[formData.addressState].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                   ) : <Input placeholder="Select state first" disabled />}
                </div>
                <div className="space-y-2">
                   <Label htmlFor="village">Village / Locality *</Label>
                   <Input id="village" value={formData.addressVillage} onChange={e => updateField('addressVillage', e.target.value)} placeholder="Village" />
                </div>
                <div className="space-y-2">
                   <Label htmlFor="block">Block *</Label>
                   <Input id="block" value={formData.addressBlock} onChange={e => updateField('addressBlock', e.target.value)} placeholder="Block" />
                </div>
                <div className="space-y-2">
                   <Label htmlFor="tahsil">Tahsil *</Label>
                   <Input id="tahsil" value={formData.addressTahsil} onChange={e => updateField('addressTahsil', e.target.value)} placeholder="Tahsil" />
                </div>
              </div>
            </section>

            {/* Section 4: Referral */}
            <section className="p-6 bg-secondary/20 rounded-[2rem] border border-border">
               <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2 mb-6">
                <Gift className="size-4" /> 04. Referral Authorization
              </h3>
              <div className="space-y-4">
                <Label htmlFor="refCode">Referral Code *</Label>
                <div className="flex gap-4">
                  <Input id="refCode" value={formData.referredByCenter} onChange={e => {
                    const v = e.target.value.toUpperCase();
                    updateField('referredByCenter', v);
                    validateReferralCode(v);
                  }} placeholder="EX: CC-XXXX" className="h-14 font-mono tracking-widest text-center" />
                </div>
                {referralInfo && <p className="text-xs text-green-600 font-bold flex items-center gap-2 mt-2"><CheckCircle className="size-4" /> {referralInfo.type}: {referralInfo.ownerName}</p>}
                <Button variant="link" size="sm" onClick={() => {
                  updateField('referredByCenter', APP_CONFIG.masterReferralCode);
                  validateReferralCode(APP_CONFIG.masterReferralCode);
                }} className="text-[10px] text-primary p-0 h-auto">Don't have a code? Use Master Code: {APP_CONFIG.masterReferralCode}</Button>
              </div>
            </section>

            {/* Section 5: Consent */}
            <section className="space-y-6">
               <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
                <Shield className="size-4" /> 05. Legal Consent
              </h3>
              <div className="space-y-4 bg-background p-6 rounded-2xl border border-border">
                {[
                  { id: 'terms', label: 'I accept the Terms and Conditions of NSEP.', state: 'termsAccepted' },
                  { id: 'privacy', label: 'I agree to the Privacy Policy regarding my data.', state: 'privacyAccepted' },
                  { id: 'referral', label: 'I accept the Referral Policy and reward structure.', state: 'referralPolicyAccepted' },
                ].map(item => (
                  <div key={item.id} className="flex items-center space-x-3">
                    <Checkbox id={item.id} checked={consentData[item.state as keyof ConsentData]} onCheckedChange={checked => setConsentData(p => ({ ...p, [item.state]: !!checked }))} />
                    <Label htmlFor={item.id} className="text-sm font-medium cursor-pointer">{item.label}</Label>
                  </div>
                ))}
                {consentError && <p className="text-xs text-destructive font-bold italic">{consentError}</p>}
              </div>
            </section>

            {/* Final Button */}
            <div className="pt-10">
              <Button 
                onClick={handleNext}
                disabled={isSubmitting}
                className="w-full h-20 rounded-[2rem] institutional-gradient text-white font-black text-2xl shadow-[0_0_30px_rgba(255,165,0,0.3)] hover:scale-[1.01] transition-all flex items-center justify-center gap-4"
              >
                {isSubmitting ? <Loader2 className="animate-spin size-8" /> : (
                  <>
                    Next <ArrowRight className="size-8" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
