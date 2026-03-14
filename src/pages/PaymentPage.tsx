import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
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

export function PaymentPage() {
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('studentId');
  const [student, setStudent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { getStudentById, updateStudent } = useStudentStore();
  const { createPayment } = usePaymentStore();

  useEffect(() => {
    async function fetchStudent() {
      if (!studentId) {
        navigate('/register');
        return;
      }
      const data = await getStudentById(studentId);
      if (!data) {
        navigate('/register');
        return;
      }
      setStudent(data);
      setIsLoading(false);
    }
    fetchStudent();
  }, [studentId, getStudentById, navigate]);

  const handlePayRedirect = async () => {
    if (!student) return;
    
    setIsProcessing(true);
    try {
      // Record the attempt in payments table (optional but good for tracking)
      await createPayment(student.id, getExamFee(student.class));
      
      // Redirect to Razorpay hosted page
      window.location.href = 'https://razorpay.me/@grampanchayathelpdeskmission';
      
      // After redirecting, the user will be away. 
      // When they come back (manually or via redirect if configured in Razorpay), 
      // they can click a "Payment Completed" button on this page.
    } catch (error) {
      console.error('Payment redirect error:', error);
      toast({
        title: 'Error',
        description: 'Failed to initiate payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPayment = async () => {
    setIsProcessing(true);
    try {
      // In a real app, we would verify with Razorpay API here.
      // For this flow, we mark as PAID as requested.
      await updateStudent(student.id, { status: 'ACTIVE' });
      
      // Update local student state
      setStudent({ ...student, status: 'ACTIVE' });
      
      setShowSuccessPopup(true);
      toast({
        title: 'Payment Confirmed! ✅',
        description: 'Your registration is now complete.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update payment status.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
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

  const examFee = getExamFee(student?.class || 0);

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
                    <span className="font-black text-foreground">{student.name}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-background rounded-2xl border border-border">
                    <span className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Class Selected</span>
                    <span className="font-black text-foreground">Class {student.class}</span>
                  </div>
                  <div className="flex justify-between items-center p-6 institutional-gradient rounded-2xl border border-primary/20 shadow-lg">
                    <div className="text-white">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">Examination Fee</p>
                      <p className="text-3xl font-black">{formatCurrency(examFee)}</p>
                    </div>
                    <Shield className="size-10 text-white/50" />
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
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-4">Already paid on Razorpay?</p>
                    <Button 
                      variant="outline"
                      onClick={handleConfirmPayment}
                      disabled={isProcessing}
                      className="w-full h-14 rounded-2xl border-green-200 text-green-700 hover:bg-green-50 font-black"
                    >
                      I have completed my payment <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-6 pt-4 opacity-50 grayscale hover:grayscale-0 transition-all">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" alt="UPI" className="h-4" />
                  <img src="https://upload.wikimedia.org/wikipedia/commons/d/d1/RuPay.svg" alt="RuPay" className="h-4" />
                  <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-3" />
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
                Why Hosted Payment?
              </h3>
              <ul className="space-y-6">
                <li className="flex gap-4">
                  <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <span className="text-primary font-black text-xs">01</span>
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm uppercase tracking-wider mb-1">Enhanced Security</p>
                    <p className="text-muted-foreground text-xs leading-relaxed">Transactions are processed directly on Razorpay's bank-grade secure infrastructure.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <span className="text-primary font-black text-xs">02</span>
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm uppercase tracking-wider mb-1">Zero Downtime</p>
                    <p className="text-muted-foreground text-xs leading-relaxed">Direct connection reduces server load, ensuring your payment is never stuck.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <span className="text-primary font-black text-xs">03</span>
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm uppercase tracking-wider mb-1">Instant Activation</p>
                    <p className="text-muted-foreground text-xs leading-relaxed">Once you confirm, your credentials will be generated instantly.</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 flex gap-4">
              <AlertCircle className="size-6 text-blue-600 shrink-0 mt-1" />
              <p className="text-xs text-blue-800 font-medium leading-relaxed">
                After successful payment on Razorpay, please return to this page and click the <strong>"I have completed my payment"</strong> button to receive your login credentials.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessPopup} onOpenChange={setShowSuccessPopup}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none bg-background shadow-3xl">
          <div className="p-8 pb-0 flex flex-col items-center text-center">
            <div className="size-20 bg-green-100 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-inner">
              <CheckCircle className="size-12 text-green-600" />
            </div>
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-3xl font-black text-foreground tracking-tight">Registration Successful!</DialogTitle>
              <DialogDescription className="text-base font-bold italic text-muted-foreground">
                Welcome to {APP_CONFIG.organization}. Your account is now active.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-4">
            <div className="p-6 bg-secondary/20 rounded-3xl border border-border space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Your Login User ID (ID)</p>
                <div className="flex gap-2">
                  <div className="flex-1 h-12 bg-background border border-border rounded-xl flex items-center px-4 font-mono font-bold text-foreground truncate">
                    {student?.email}
                  </div>
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(student?.email, 'User ID')} className="h-12 w-12 rounded-xl">
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Your Password (HIDDEN)</p>
                <div className="flex gap-2">
                  <div className="flex-1 h-12 bg-background border border-border rounded-xl flex items-center px-4 font-mono font-bold text-foreground">
                    ••••••••
                  </div>
                  <div className="text-[10px] text-green-600 font-black flex items-center gap-1 uppercase tracking-widest bg-green-50 px-3 rounded-xl border border-green-100">
                    <Shield className="size-3" /> Secure
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground italic ml-1">* Use the password you created during form submission.</p>
              </div>
            </div>

            <Button 
              onClick={() => navigate('/login')}
              className="w-full h-16 rounded-2xl institutional-gradient text-white font-black text-lg shadow-[0_0_20px_rgba(255,165,0,0.3)] hover:scale-[1.02] transition-transform"
            >
              Go to Login Page <LogIn className="ml-2 size-5" />
            </Button>
            
            <p className="text-center text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              Need help? Contact {APP_CONFIG.supportEmail}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
