import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CreditCard,
  ClipboardList,
  Award,
  Wallet,
  Copy,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Gift,
  Loader2,
  Users,
  Camera,
  Upload,
  X,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  useAuthStore,
  usePaymentStore,
  useExamStore,
  useWalletStore,
  useCenterRewardStore,
  useStudentStore,
} from '@/stores';
import { getExamFee, APP_CONFIG, EXAM_CONFIG } from '@/constants/config';
import { formatCurrency, formatDate, compressImage } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { client as backend } from '@/lib/backend';

// Maximum file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Allowed image types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function StudentDashboard() {
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { isLoading: authLoading, currentStudent } = useAuthStore();
  const { payments, loadPayments, hasSuccessfulPayment, isLoading: paymentsLoading } = usePaymentStore();
  const { results, loadExamData, hasCompletedExam, isLoading: examsLoading } = useExamStore();
  const { loadWallets, getWalletByStudent, isLoading: walletsLoading } = useWalletStore();
  const { loadRewards, getRewardsByOwner, isLoading: rewardsLoading } = useCenterRewardStore();
  const { updateStudent } = useStudentStore();
  const [urlStudent, setUrlStudent] = useState<any>(null);
  const [isFetchingUrlStudent, setIsFetchingUrlStudent] = useState(false);
  const [searchParams] = useSearchParams();
  const studentIdParam = searchParams.get('student_id');
  const navigate = useNavigate();

  // Handle direct redirection via student_id query param
  useEffect(() => {
    async function fetchIndividualStudent() {
      if (studentIdParam) {
        setIsFetchingUrlStudent(true);
        try {
          const { data, error } = await backend
            .from('students')
            .select('*')
            .eq('id', studentIdParam)
            .maybeSingle();
          
          if (data) {
            setUrlStudent(data);
          }
        } catch (err) {
          console.error('Error fetching student from URL:', err);
        } finally {
          setIsFetchingUrlStudent(false);
        }
      }
    }
    fetchIndividualStudent();
  }, [studentIdParam]);

  const student = urlStudent || currentStudent;
  const isStudentLoading = authLoading || isFetchingUrlStudent;

  // Photo upload handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !student) return;

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast({ title: "Invalid File", description: "Only JPG, PNG and WebP are allowed.", variant: "destructive" });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "File Too Large", description: "Image size must be less than 2MB.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const compressToast = toast({ title: "Processing Image", description: "Optimizing photo for upload..." });

      // Compress image
      const compressedBase64 = await compressImage(file, 800);
      const res = await fetch(compressedBase64);
      const blob = await res.blob();
      const fileExt = file.name.split('.').pop() || 'jpg';
      const compressedFile = new File([blob], file.name, { type: blob.type || 'image/jpeg' });

      // Upload to storage
      const fileName = `${student.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await backend.storage
        .from('student-photos')
        .upload(fileName, compressedFile, { contentType: compressedFile.type });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = backend.storage
        .from('student-photos')
        .getPublicUrl(fileName);

      // Update student record
      await updateStudent(student.id, { photoUrl: publicUrl });

      compressToast.dismiss();
      toast({ title: "Success ✓", description: "Passport photo uploaded successfully." });
    } catch (error) {
      console.error("Upload error", error);
      toast({ title: "Upload Failed", description: "Could not upload photo. Please try again.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remove photo handler
  const handleRemovePhoto = async () => {
    if (!student?.photoUrl) return;

    if (!confirm('Are you sure you want to remove your passport photo?')) return;

    setIsUploading(true);
    try {
      // Extract file path from URL
      const urlMatches = student.photoUrl.match(/student-photos\/(.+)$/);
      if (urlMatches && urlMatches[1]) {
        await backend.storage.from('student-photos').remove([urlMatches[1]]);
      }

      // Update student record
      await updateStudent(student.id, { photoUrl: undefined });
      toast({ title: "Success", description: "Photo removed successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove photo.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (student) {
      loadPayments();
      loadExamData();
      loadWallets();
      loadRewards();
    }
  }, [student, loadPayments, loadExamData, loadWallets, loadRewards]);

  // Security check: Only allow access if student exists
  useEffect(() => {
    if (!isStudentLoading && !student) {
      navigate('/login');
    }
  }, [student, isStudentLoading, navigate]);

  const isLoading = isStudentLoading || paymentsLoading || examsLoading || walletsLoading || rewardsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertTriangle className="size-12 text-yellow-500" />
        <h2 className="text-2xl font-bold">Student Not Found</h2>
        <Button onClick={() => navigate('/login')}>Return to Login</Button>
      </div>
    );
  }

  // Handle Pending Payment Status UI
  if (student.payment_status !== 'success') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full bg-background rounded-[3rem] border border-border p-10 lg:p-16 text-center shadow-3xl space-y-8"
        >
          <div className="mx-auto size-24 bg-yellow-500/10 rounded-[2rem] flex items-center justify-center shadow-lg animate-pulse">
            <Clock className="size-12 text-yellow-500" />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-foreground tracking-tight">Payment Under Verification</h2>
            <p className="text-muted-foreground font-bold italic text-lg leading-relaxed">
              We have received your registration data. Since you used a manual payment link, our team will verify your transaction within 2-4 hours.
            </p>
          </div>
          
          <div className="bg-secondary/20 rounded-2xl p-6 border border-border text-left space-y-3">
            <p className="text-xs font-black text-primary uppercase tracking-widest">Next Steps:</p>
            <ul className="text-sm text-foreground font-bold space-y-2">
              <li className="flex items-center gap-2">✓ Payment completed via Razorpay link</li>
              <li className="flex items-center gap-2">📂 Data archived in our secure systems</li>
              <li className="flex items-center gap-2 text-yellow-500">⏳ Verification in progress by Admin</li>
            </ul>
          </div>

          <p className="text-sm text-muted-foreground font-bold italic">
            Need help? Contact us: <span className="text-primary">{APP_CONFIG.supportPhone}</span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button onClick={() => window.location.reload()} className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest">
              Check Status
            </Button>
            <Button variant="outline" onClick={() => useAuthStore.getState().signOut()} className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest">
              Logout
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const hasPaid = student.payment_status === 'success';
  const examCompleted = hasCompletedExam(student.id);
  const examResult = results.find((r) => r.studentId === student.id);
  const wallet = getWalletByStudent(student.id);
  const myRewards = getRewardsByOwner(student.id);
  const examFee = getExamFee(student.class);

  const getNextStep = () => {
    if (student.status === 'PENDING') {
      if (hasPaid) return { action: 'Activate Account', link: '/dashboard', urgent: true };
      return { action: 'Complete Payment', link: `/payment?studentId=${student.id}`, urgent: true };
    }
    return { action: 'View Results', link: '/dashboard/results', urgent: false };
  };

  const nextStep = getNextStep();

  return (
    <div className="p-6 lg:p-10 space-y-8 relative z-10">
      {/* Header with Profile Photo */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-6"
        >
          {/* Profile Photo Section */}
          <div className="relative group">
            <div className="size-24 rounded-full border-4 border-white/20 shadow-xl overflow-hidden bg-muted flex items-center justify-center">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="size-10 text-white/40" />
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="size-6 text-white animate-spin" />
                </div>
              )}
            </div>
            {student.photoUrl && !isUploading && (
              <button
                onClick={handleRemovePhoto}
                className="absolute -top-1 -right-1 size-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="size-3" />
              </button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handlePhotoUpload}
              disabled={isUploading}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-7 px-3 text-[10px] font-bold rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Camera className="size-3 mr-1" />
              {student.photoUrl ? 'Change' : 'Upload'}
            </Button>
          </div>

          <div>
            <h1 className="text-4xl lg:text-5xl font-black text-foreground tracking-tighter mb-2">
              Welcome, <span className="premium-text-gradient">{student.name}!</span>
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground font-bold italic text-sm">
              <span className="bg-primary/10 text-primary px-3 py-0.5 rounded-full not-italic">ID: {student.email}</span>
              <span>Class {student.class}</span>
              <span>•</span>
              <span>{student.address_district || student.addressDistrict}</span>
              <span>•</span>
              <span>Registered: {formatDate(student.created_at)}</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Link to={nextStep.link}>
            <Button className={cn(
              "h-14 px-8 rounded-2xl font-black text-lg shadow-xl hover:scale-105 transition-transform",
              nextStep.urgent ? 'institutional-gradient' : 'bg-secondary/20 text-foreground backdrop-blur-md border border-border'
            )}>
              {nextStep.action}
              <ArrowRight className="size-5 ml-3" />
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Status Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="bg-background p-6 rounded-[2rem] border border-border hover:border-primary/30 transition-all group">
            <div className="flex items-center gap-5">
              <div className={cn(
                "size-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3",
                hasPaid ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
              )}>
                <CreditCard className="size-7" />
              </div>
              <div>
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Payment</p>
                <div className="flex items-center gap-2">
                  <p className={cn("text-xl font-black", hasPaid ? 'text-green-400' : 'text-yellow-400')}>
                    {hasPaid ? 'Verified' : 'Pending'}
                  </p>
                </div>
              </div>
            </div>
            {!hasPaid && useAuthStore.getState().isAdminLoggedIn && (
              <Button
                size="sm"
                className="w-full mt-4 h-10 rounded-xl bg-green-500 text-white font-black text-[10px] tracking-widest uppercase hover:bg-green-600 shadow-lg shadow-green-500/20"
                onClick={async () => {
                  const pendingPayment = payments.find(p => p.studentId === student.id && p.status === 'PENDING');
                  if (pendingPayment) {
                    if (confirm(`Approve payment for ${student.name}?`)) {
                      await usePaymentStore.getState().approvePayment(pendingPayment.id);
                      toast({ title: "Approved ✅", description: "Payment approved successfully." });
                    }
                  } else {
                    toast({ title: "No Pending Payment", description: "No pending payment found to approve." });
                  }
                }}
              >
                Admin Approve
              </Button>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="bg-background p-6 rounded-[2rem] border border-border hover:border-primary/30 transition-all group">
            <div className="flex items-center gap-5">
              <div className={cn(
                "size-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 group-hover:-rotate-3",
                examCompleted ? 'bg-green-500/20 text-green-600' : 'bg-secondary/20 text-muted-foreground'
              )}>
                <ClipboardList className="size-7" />
              </div>
              <div>
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Examination</p>
                <p className={cn("text-xl font-black", examCompleted ? 'text-green-600' : 'text-muted-foreground')}>
                  {examCompleted ? 'Completed' : hasPaid ? 'Ready' : 'Locked'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="bg-background p-6 rounded-[2rem] border border-border hover:border-primary/30 transition-all group">
            <div className="flex items-center gap-5">
              <div className="size-14 rounded-2xl bg-primary/20 text-primary flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                <Award className="size-7" />
              </div>
              <div>
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Scholar Rank</p>
                <p className="text-xl font-black text-primary">
                  {examResult?.rank ? `#${examResult.rank}` : 'Not Ranked'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div className="bg-background p-6 rounded-[2rem] border border-border hover:border-primary/30 transition-all group">
            <div className="flex items-center gap-5">
              <div className="size-14 rounded-2xl bg-accent/20 text-accent flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                <Wallet className="size-7" />
              </div>
              <div>
                <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Wallet Balance</p>
                <p className="text-xl font-black text-accent">
                  {formatCurrency(wallet?.balance || 0)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Referral Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          <div className="premium-card relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -z-10 group-hover:bg-primary/20 transition-colors" />

            <div className="p-8 lg:p-10">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-3xl font-black text-foreground tracking-tighter mb-2 flex items-center gap-3">
                    <Gift className="size-8 text-primary animate-bounce-subtle" />
                    Student Referral Program
                  </h2>
                  <p className="text-muted-foreground font-bold italic">
                    Help others join the {APP_CONFIG.shortName} mission and earn rewards.
                  </p>
                </div>
                <div className="hidden sm:block">
                  <div className="premium-badge animate-pulse">Program Active</div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-background p-6 rounded-[2rem] border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Access Protocol Link</p>
                    <div className="text-[10px] bg-green-500/20 text-green-400 px-3 py-1 rounded-full font-black uppercase tracking-wider">
                      ₹25 Credit / Scholar
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch gap-4">
                    <div className="flex-1 px-6 py-4 bg-secondary/20 rounded-2xl border border-border font-mono text-sm text-primary font-black break-all flex items-center">
                      {typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${student.referralCode || student.centerCode}` : ''}
                    </div>
                    <Button
                      onClick={() => {
                        const link = `${window.location.origin}/register?ref=${student.referralCode || student.centerCode}`;
                        navigator.clipboard.writeText(link);
                        setCopied(true);
                        toast({ title: "Signal Cached! 📋", description: "Referral link copied to memory." });
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="h-16 px-10 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-black text-lg shadow-[0_0_20px_rgba(255,165,0,0.3)] hover:scale-105 transition-transform"
                    >
                      {copied ? <CheckCircle className="size-6 mr-3" /> : <Copy className="size-6 mr-3" />}
                      {copied ? 'Copied' : 'Cache Link'}
                    </Button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="bg-background p-6 rounded-[2rem] border border-border flex flex-col justify-center">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Unique Identification Code</p>
                    <p className="text-3xl font-mono font-black text-foreground tracking-[0.3em]">
                      {student.referralCode || student.centerCode}
                    </p>
                  </div>
                  <div className="bg-background p-6 rounded-[2rem] border border-border flex items-center gap-5">
                    <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner border border-primary/20">
                      <Gift className="size-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-black text-foreground tracking-tight">Earn Rewards</p>
                      <p className="text-sm text-muted-foreground font-bold italic leading-tight">Instant wallet credit for every validated scholar registration.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="bg-background rounded-[2.5rem] border border-border overflow-hidden h-full flex flex-col">
            <div className="p-8 border-b border-border bg-secondary/20">
              <h3 className="text-2xl font-black text-foreground tracking-tighter">Quick Actions</h3>
            </div>
            <div className="p-8 space-y-4 flex-1">
              {student.status === 'PENDING' && (
                <Link to={`/payment?studentId=${student.id}`} className="block">
                  <Button className="w-full h-14 rounded-2xl justify-between gap-3 institutional-gradient px-6 font-black uppercase text-xs tracking-widest transition-transform hover:scale-[1.02]">
                    <span className="flex items-center gap-3">
                      <ArrowRight className="size-5" />
                      {hasPaid ? 'Verify Payment' : 'Pay Fee Now'}
                    </span>
                  </Button>
                </Link>
              )}
              {hasPaid && !examCompleted && (
                <Link to="/dashboard/exam" className="block text-foreground">
                  <Button className="w-full h-14 rounded-2xl justify-between gap-3 institutional-gradient px-6 font-black uppercase text-xs tracking-widest transition-transform hover:scale-[1.02]">
                    <span className="flex items-center gap-3">
                      <ClipboardList className="size-5" />
                      Initiate Exam
                    </span>
                    <ArrowRight className="size-4 opacity-50" />
                  </Button>
                </Link>
              )}
              {examCompleted && (
                <Link to="/dashboard/results" className="block text-foreground">
                  <Button className="w-full h-14 rounded-2xl justify-between gap-3 bg-green-500/20 border border-green-500/30 hover:bg-green-500/30 px-6 font-black uppercase text-xs tracking-widest transition-transform hover:scale-[1.02]">
                    <span className="flex items-center gap-3 text-green-400">
                      <Award className="size-5" />
                      View Results
                    </span>
                    <ArrowRight className="size-4 opacity-50" />
                  </Button>
                </Link>
              )}
              <Link to="/dashboard/syllabus" className="block">
                <Button variant="outline" className="w-full h-14 rounded-2xl justify-between gap-3 bg-input border-border hover:bg-secondary/30 hover:border-primary/50 px-6 font-black uppercase text-xs tracking-widest transition-all text-foreground">
                  <span className="flex items-center gap-3 text-muted-foreground">
                    <Wallet className="size-5" />
                    Access Wallet
                  </span>
                  <ArrowRight className="size-4 opacity-50" />
                </Button>
              </Link>
              <Link to="/dashboard/certificates" className="block">
                <Button variant="outline" className="w-full h-14 rounded-2xl justify-between gap-3 bg-input border-border hover:bg-secondary/30 hover:border-primary/50 px-6 font-black uppercase text-xs tracking-widest transition-all text-foreground">
                  <span className="flex items-center gap-3 text-muted-foreground">
                    <Award className="size-5" />
                    Scholastic Medals
                  </span>
                  <ArrowRight className="size-4 opacity-50" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Alerts & Exam Info */}
      <div className="grid lg:grid-cols-2 gap-8">
        {currentStudent.status === 'PENDING' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-background rounded-[2.5rem] border border-primary/30 p-8 lg:p-10 relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
              <div className="flex items-start gap-6">
                <div className="p-4 bg-primary/20 rounded-2xl border border-primary/20 animate-pulse">
                  <Loader2 className="size-8 text-primary animate-spin" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-foreground tracking-tight mb-3">Entrance Authorization Required</h3>
                  <p className="text-muted-foreground font-bold italic leading-relaxed mb-8">
                    {hasPaid
                      ? "Exam donation validated! Access link established. Finalize your scholar profile (address & school details) to authorize full exam access."
                      : "Authorize your entry. Complete the registration sequence and process the donation to activate your scholastic mission."}
                  </p>
                  <Link to={`/payment?studentId=${currentStudent.id}`}>
                    <Button size="lg" className="rounded-2xl h-14 px-10 institutional-gradient font-black uppercase tracking-widest text-xs">
                      {hasPaid ? 'Verify Payment' : 'Pay Activation Fee'}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-background rounded-[2.5rem] border border-border p-8 lg:p-10 h-full">
            <h3 className="text-2xl font-black text-foreground tracking-tighter mb-8">Mission Briefing</h3>
            <div className="grid grid-cols-2 gap-6">
              {[
                { label: 'Total Sequence', value: `${EXAM_CONFIG.totalQuestions} Questions`, color: 'text-foreground' },
                { label: 'Time Allocation', value: `${EXAM_CONFIG.defaultTimePerQuestion}s / Question`, color: 'text-foreground' },
                { label: 'Success Credit', value: `+${EXAM_CONFIG.marksPerCorrect} Marks`, color: 'text-green-600' },
                { label: 'Penalty Logic', value: `${EXAM_CONFIG.marksPerWrong} Marks`, color: 'text-red-600' },
              ].map((item, i) => (
                <div key={i} className="p-5 bg-secondary/20 rounded-2xl border border-border hover:border-primary/20 transition-colors">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{item.label}</p>
                  <p className={cn("text-xl font-black tracking-tight", item.color)}>{item.value}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-8 flex items-center gap-2">
              <AlertTriangle className="size-3" />
              Auto-progression active. No retrospective navigation permitted.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
