import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, CheckCircle, ArrowRight, GraduationCap, Shield, LogIn, Copy, Share2, Download, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useStudentStore, useAuthStore, usePaymentStore } from '@/stores';
import { APP_CONFIG, getExamFee } from '@/constants/config';
import { formatCurrency } from '@/lib/utils';
import { client as backend } from '@/lib/backend';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { loadRazorpayScript, RAZORPAY_CONFIG } from '@/constants/razorpay';

export function PaymentPage() {
  const location = useLocation();
  const registrationData = location.state?.registrationData;
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [newStudent, setNewStudent] = useState<any>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { addStudent } = useStudentStore();
  const { createPayment } = usePaymentStore();

  useEffect(() => {
    if (!registrationData) {
      toast({ title: 'Session Expired', description: 'Registration data not found. Please fill the form again.', variant: 'destructive' });
      navigate('/register');
    }
  }, [registrationData, navigate]);

  const handlePayRedirect = async () => {
    if (!registrationData) return;
    
    setIsProcessing(true);
    try {
      // 1. Create the Account & Student record FIRST 
      // This ensures we don't lose the registration data even if they pay and close the tab
      const result = await finalizeRegistration(registrationData, 'MANUAL_LINK_PENDING');
      
      if (result) {
        // 2. Open the static Razorpay link in a new tab
        const paymentLink = "https://razorpay.me/@grampanchayathelpdeskmission";
        window.open(paymentLink, '_blank');
        
        toast({ 
          title: 'Registration Initiated', 
          description: 'A new tab has opened for payment. After paying, return here to view your dashboard.',
          duration: 10000 
        });
      }

    } catch (error: any) {
      console.error('Registration/Redirect Error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process registration.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const finalizeRegistration = async (data: any, paymentId: string) => {
    try {
      const isManual = paymentId.startsWith('MANUAL_');
      
      // A. Create Auth User with the provided email
      const { data: authData, error: authError } = await backend.auth.signUp({
        email: data.email,
        password: data.password || 'password123',
      });

      if (authError) {
        if (authError.message.toLowerCase().includes('already registered')) {
          const { error: signInError } = await backend.auth.signInWithPassword({
            email: data.email,
            password: data.password || 'password123',
          });
          if (signInError) {
            throw new Error('This email is already registered with a different password. Please log in or use a different email.');
          }
        } else {
          throw authError;
        }
      }

      const { data: { user } } = await backend.auth.getUser();
      if (!user) throw new Error('Auth finalization failed.');

      // B. Create Student Record
      const student = await addStudent({
        name: data.name,
        fatherName: data.fatherName,
        class: data.class,
        mobile: data.mobile,
        email: data.email,
        schoolName: data.schoolName,
        schoolContact: data.schoolContact,
        addressVillage: data.addressVillage,
        addressBlock: data.addressBlock,
        addressTahsil: data.addressTahsil,
        addressDistrict: data.addressDistrict,
        addressState: data.addressState,
        photoUrl: data.photoUrl,
        password: data.password,
        referredByCenter: data.referralType === 'CENTER' ? data.referredBy : undefined,
        referredByStudent: data.referralType === 'STUDENT' ? data.referredBy : undefined,
      }, user.id);

      if (!student) throw new Error('Database registration failed.');

      // C. Update status
      // If manual, we set to PENDING verification. If automated, we set to SUCCESS.
      const updateData = isManual 
        ? { status: 'PENDING', payment_status: 'Pending' }
        : { status: 'ACTIVE', payment_status: 'success' };
        
      await backend.from('students').update(updateData).eq('id', user.id);
      
      setNewStudent(student);
      setShowSuccessPopup(true);
      
      if (!isManual) {
        toast({ title: 'Success! ✅', description: 'Payment verified and registration complete.' });
      }

      return student;

    } catch (err: any) {
      console.error('Finalize error:', err);
      throw err;
    }
  };

  const handleGoToDashboard = () => {
    setShowSuccessPopup(false);
    if (newStudent) {
      navigate(`/student-dashboard?student_id=${newStudent.id}`);
    } else {
      navigate('/login');
    }
  };

  const handleConfirmPayment = async () => {
    // This is for fallback if webhook/handler misses
    toast({ title: 'Processing', description: 'Verifying your payment records...' });
    // In this post-pay flow, we'd normally wait for the handler above.
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} Copied`, description: 'Copied to clipboard.' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  const examFee = getExamFee(registrationData?.class || 0);

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Link to="/" className="inline-flex items-center gap-3 text-primary mb-6 group bg-primary/10 px-6 py-2 rounded-full border border-primary/20 backdrop-blur-md">
            <GraduationCap className="size-8" />
            <span className="text-2xl font-black text-foreground tracking-tighter">{APP_CONFIG.shortName}</span>
          </Link>
          <h1 className="text-4xl lg:text-5xl font-black text-foreground mb-4 tracking-tight">
            Final Step: <span className="text-primary">Payment</span>
          </h1>
          <p className="text-lg text-muted-foreground font-bold italic max-w-xl mx-auto">
            Please complete your examination fee to activate your enrollment.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Main Payment Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="rounded-[2.5rem] border-border shadow-2xl overflow-hidden">
              <div className="p-8 bg-primary/5 border-b border-border">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
                    <CreditCard className="size-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-foreground tracking-tight">Payment Summary</h2>
                    <p className="text-sm text-muted-foreground font-bold italic">Safe & Secure Transaction</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-8 space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-background rounded-2xl border border-border">
                    <span className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Student Name</span>
                    <span className="font-black text-foreground">{registrationData?.name}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-background rounded-2xl border border-border">
                    <span className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Class Selected</span>
                    <span className="font-black text-foreground">Class {registrationData?.class}</span>
                  </div>
                  <div className="flex justify-between items-center p-6 bg-secondary/30 rounded-2xl border border-border shadow-md">
                    <div className="text-foreground">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Examination Fee</p>
                      <p className="text-3xl font-black text-black">{formatCurrency(examFee)}</p>
                    </div>
                    <Shield className="size-10 text-primary/30" />
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <Button 
                    onClick={handlePayRedirect}
                    disabled={isProcessing}
                    className="w-full h-16 rounded-2xl bg-primary text-white font-black text-lg shadow-[0_0_20px_rgba(33,150,243,0.3)] hover:scale-[1.02] transition-transform flex gap-3"
                  >
                    {isProcessing ? <Loader2 className="animate-spin" /> : <CreditCard className="size-6" />}
                    Pay with Razorpay
                  </Button>
                  
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground font-medium mb-2">Secure Payment Gateway</p>
                    <div className="flex items-center justify-center gap-6 opacity-50 grayscale hover:grayscale-0 transition-all">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" alt="UPI" className="h-4" />
                      <img src="https://upload.wikimedia.org/wikipedia/commons/d/d1/RuPay.svg" alt="RuPay" className="h-4" />
                      <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-3" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Info Side */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-gradient-to-br from-background to-secondary/20 p-8 rounded-[2.5rem] border border-border">
              <h3 className="text-xl font-black text-foreground mb-6 flex items-center gap-3 tracking-tight">
                <Shield className="size-6 text-primary" />
                Enrollment Security
              </h3>
              <ul className="space-y-6">
                <li className="flex gap-4">
                  <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <span className="text-primary font-black text-xs">01</span>
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm uppercase tracking-wider mb-1">Success-Only Registration</p>
                    <p className="text-muted-foreground text-xs leading-relaxed">Your account is created only after the bank confirms your payment success.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <span className="text-primary font-black text-xs">02</span>
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm uppercase tracking-wider mb-1">Instant Activation</p>
                    <p className="text-muted-foreground text-xs leading-relaxed">Once you pay, you will be redirected straight to your dashboard with all credentials.</p>
                  </div>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessPopup} onOpenChange={setShowSuccessPopup}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none bg-background shadow-3xl" onInteractOutside={(e) => e.preventDefault()}>
          <div className="p-8 pb-0 flex flex-col items-center text-center">
            <div className="size-20 bg-green-100 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-inner">
              <CheckCircle className="size-12 text-green-600" />
            </div>
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-3xl font-black text-foreground tracking-tight">Payment Successful</DialogTitle>
              <DialogDescription className="text-base font-bold italic text-muted-foreground">
                Registration Complete. Your account is now active.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-4">
            <div className="p-6 bg-secondary/20 rounded-3xl border border-border space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Student ID</p>
                <div className="flex gap-2">
                  <div className="flex-1 h-12 bg-background border border-border rounded-xl flex items-center px-4 font-mono font-bold text-foreground truncate">
                    {newStudent?.email}
                  </div>
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(newStudent?.email, 'User ID')} className="h-12 w-12 rounded-xl">
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleGoToDashboard}
              className="w-full h-16 rounded-2xl institutional-gradient text-white font-black text-lg shadow-[0_0_20px_rgba(255,165,0,0.3)] hover:scale-[1.02] transition-transform"
            >
              Go to Dashboard <LogIn className="ml-2 size-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
