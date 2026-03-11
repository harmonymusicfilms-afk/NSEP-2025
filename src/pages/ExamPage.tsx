import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  CreditCard,
  Play,
  Loader2,
  Award,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  useAuthStore,
  usePaymentStore,
  useExamStore,
  useCenterRewardStore,
  useStudentStore,
} from '@/stores';
import { getExamFee, EXAM_CONFIG, REFERRAL_CONFIG, APP_CONFIG } from '@/constants/config';
import { formatCurrency, formatTime, generatePaymentId } from '@/lib/utils';

type ExamPhase = 'approval' | 'payment' | 'ready' | 'exam' | 'gap' | 'completed';

export function ExamPage() {
  const [phase, setPhase] = useState<ExamPhase>('payment');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [gapTimeLeft, setGapTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showConfirmStart, setShowConfirmStart] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [answers, setAnswers] = useState<{ questionId: string; selected: number | null; timeTaken: number }[]>([]);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentStudent, isStudentLoggedIn } = useAuthStore();
  const { hasSuccessfulPayment, createPayment, verifyPayment, loadPayments } = usePaymentStore();
  const { config, isLoading, hasCompletedExam, completeExam, startExam, loadExamData, loadQuestions, questions: storeQuestions, sessions } = useExamStore();
  const { createReward } = useCenterRewardStore();
  const { getStudentByCenterCode, getStudentByReferralCode, loadStudents } = useStudentStore();

  useEffect(() => {
    loadPayments();
    loadExamData();
    loadStudents();
  }, [loadPayments, loadExamData, loadStudents]);

  useEffect(() => {
    if (currentStudent?.class) {
      loadQuestions(currentStudent.class);
    }
  }, [currentStudent?.id, loadQuestions]);

  useEffect(() => {
    if (!currentStudent) return;

    // If student is PENDING, they must complete registration flow first
    if (currentStudent.status === 'PENDING') {
      navigate('/register');
      return;
    }

    // Validate current phase to prevent overwriting active exam state
    if (phase === 'exam' || phase === 'gap') return;

    if (hasCompletedExam(currentStudent.id)) {
      setPhase('completed');
    } else if (hasSuccessfulPayment(currentStudent.id)) {
      setPhase('ready');
    } else {
      setPhase('payment');
    }
  }, [currentStudent, hasSuccessfulPayment, hasCompletedExam, phase]);

  const questions = storeQuestions.slice(0, config.demoQuestionCount);

  const currentQuestion = questions[currentQuestionIndex];

  // Timer for questions
  useEffect(() => {
    if (phase !== 'exam' || !currentQuestion) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleAnswerSubmit(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, currentQuestionIndex]);

  // Timer for gap between questions
  useEffect(() => {
    if (phase !== 'gap') return;

    const timer = setInterval(() => {
      setGapTimeLeft((prev) => {
        if (prev <= 1) {
          moveToNextQuestion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase]);

  /* Helper to get IP */
  const getPublicIP = async (): Promise<string> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const response = await fetch('https://api.ipify.org?format=json', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      return data.ip;
    } catch {
      return 'Unknown (Client-side)';
    }
  };

  const handlePayment = async () => {
    if (!currentStudent) return;

    setIsProcessingPayment(true);
    const examFee = getExamFee(currentStudent.class);

    try {
      // 1. Create Payment Order in Backend
      // (Ideally create order via Edge Function for Razorpay Order ID, but using store for now)
      const payment = await createPayment(currentStudent.id, examFee);

      if (!payment) throw new Error('Failed to initiate payment.');

      // 2. Open Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_YourKeyHere', // Replace with real key
        amount: examFee * 100, // Amount in paise
        currency: 'INR',
        name: 'National Scholarship Exam',
        description: `Exam Donation for Class ${currentStudent.class}`,
        image: '/favicon.ico', // Update with actual logo path
        order_id: payment.razorpayOrderId, // Generated in store
        handler: async function (response: any) {
          try {
            // 3. Verify Payment
            const verifiedPayment = await verifyPayment(
              payment.id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );

            if (verifiedPayment) {
              // Apply referral rewards
              const refCode = currentStudent.referredByCenter || currentStudent.referredByStudent;
              if (refCode) {
                let referrer = null;
                let rewardAmount = 0;

                if (currentStudent.referredByCenter) {
                  referrer = await getStudentByCenterCode(currentStudent.referredByCenter);
                  rewardAmount = REFERRAL_CONFIG.centerCodeReward;
                } else if (currentStudent.referredByStudent) {
                  referrer = await getStudentByReferralCode(currentStudent.referredByStudent);
                  rewardAmount = REFERRAL_CONFIG.studentReferralReward;
                }

                if (referrer && referrer.id !== currentStudent.id) {
                  await createReward(referrer.id, currentStudent.id, payment.id, rewardAmount);
                }
              }

              toast({
                title: 'THANK YOU! / धन्यवाद! ✅',
                description: 'Payment Successful. Your exam is now unlocked. Good luck!',
              });
              setPhase('ready');
            } else {
              throw new Error('Verification failed.');
            }
          } catch (err) {
            console.error('Payment Verification Error:', err);
            toast({ variant: 'destructive', title: 'Payment Verification Failed' });
          }
        },
        prefill: {
          name: currentStudent.name,
          email: currentStudent.email,
          contact: currentStudent.mobile,
        },
        theme: {
          color: '#0F172A',
        },
        modal: {
          ondismiss: function () {
            setIsProcessingPayment(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error('Payment Failed:', response.error);
        toast({
          variant: 'destructive',
          title: 'Payment Failed',
          description: response.error.description || 'Transaction declined.',
        });
        setIsProcessingPayment(false);
      });
      rzp.open();

    } catch (error: any) {
      console.error('Payment Error:', error);
      toast({
        variant: 'destructive',
        title: 'Payment Error',
        description: error.message || 'Failed to start Razorpay checkout. Please refresh.',
      });
      setIsProcessingPayment(false);
    }
  };

  const startExamHandler = async () => {
    if (!currentStudent) return;

    const ip = await getPublicIP();
    const ua = navigator.userAgent;

    await startExam(currentStudent.id, currentStudent.class, ip, ua);
    setCurrentQuestionIndex(0);
    setScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    setAnswers([]);
    setTimeLeft(config.timePerQuestion);
    setPhase('exam');
    setShowConfirmStart(false);
  };

  const handleAnswerSubmit = useCallback(async (answerIndex: number | null) => {
    if (!currentQuestion || !currentStudent) return;

    const timeTaken = config.timePerQuestion - timeLeft;
    const isCorrect = answerIndex === currentQuestion.correctOptionIndex;

    const session = sessions.find((s) => s.studentId === currentStudent.id && s.status === 'IN_PROGRESS');
    if (session) {
      await useExamStore.getState().submitAnswer(session.id, currentQuestion.id, answerIndex ?? -1, timeTaken);
    }

    // Update scores
    if (answerIndex !== null) {
      if (isCorrect) {
        setScore((prev) => prev + config.marksPerCorrect);
        setCorrectCount((prev) => prev + 1);
      } else {
        setScore((prev) => prev + config.marksPerWrong);
        setWrongCount((prev) => prev + 1);
      }
    }

    // Record answer
    setAnswers((prev) => [
      ...prev,
      { questionId: currentQuestion.id, selected: answerIndex, timeTaken },
    ]);

    setSelectedAnswer(answerIndex);

    // Check if this was the last question
    if (currentQuestionIndex >= questions.length - 1) {
      await finishExam();
    } else {
      // Start gap timer
      setGapTimeLeft(config.gapBetweenQuestions);
      setPhase('gap');
    }
  }, [currentQuestion, timeLeft, config, currentQuestionIndex, questions.length, currentStudent, sessions]);

  const moveToNextQuestion = () => {
    setCurrentQuestionIndex((prev) => prev + 1);
    setSelectedAnswer(null);
    setTimeLeft(config.timePerQuestion);
    setPhase('exam');
  };

  const finishExam = async () => {
    if (!currentStudent) return;

    const session = sessions.find((s) => s.studentId === currentStudent.id && s.status === 'IN_PROGRESS');
    if (session) {
      await completeExam(session.id);
    }

    setPhase('completed');
    toast({
      title: 'Exam Completed! 🎉',
      description: 'Your certificate has been generated. Check the Certificates section to download it.',
    });
  };

  // Authentication check
  useEffect(() => {
    if (!isStudentLoggedIn) {
      navigate('/login');
    }
  }, [isStudentLoggedIn, navigate]);

  if (!currentStudent || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">{isLoading ? 'Loading exam questions...' : 'Verifying student account...'}</p>
        </div>
      </div>
    );
  }

  const examFee = getExamFee(currentStudent.class);

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Approval Phase */}
        {phase === 'approval' && (
          <Card className="max-w-lg mx-auto border-yellow-200 bg-yellow-50/30">
            <CardHeader className="text-center">
              <div className="mx-auto size-16 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                <Loader2 className="size-8 text-yellow-600 animate-spin" />
              </div>
              <CardTitle className="font-serif text-2xl text-yellow-800">Registration Pending</CardTitle>
              <CardDescription className="text-yellow-700">
                Your registration is currently under review by our administrator.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-yellow-600">
                Once your profile is approved, you will be able to pay the exam donation and access the examination.
                Please check back in 24-48 hours.
              </p>
              <div className="pt-4">
                <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full">
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Phase */}
        {phase === 'payment' && (
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto size-16 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                <CreditCard className="size-8 text-yellow-600" />
              </div>
              <CardTitle className="font-serif text-2xl">Pay Exam Donation</CardTitle>
              <CardDescription>
                Complete payment to unlock your examination
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Student Name</span>
                  <span className="font-medium">{currentStudent.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Class</span>
                  <span className="font-medium">Class {currentStudent.class}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Exam Donation</span>
                  <span className="font-bold text-primary text-lg">{formatCurrency(examFee)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full institutional-gradient h-14"
                  size="lg"
                  onClick={handlePayment}
                  disabled={isProcessingPayment}
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="size-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="size-5 mr-2" />
                      Pay Fee & Unlock Exam
                    </>
                  )}
                </Button>

              </div>

              <p className="text-xs text-center text-muted-foreground">
                Donation: {formatCurrency(examFee)} • Verified Payment Required
              </p>
            </CardContent>
          </Card>
        )}

        {/* Ready Phase */}
        {phase === 'ready' && (
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto size-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircle className="size-8 text-green-600" />
              </div>
              <CardTitle className="font-serif text-2xl">Ready to Begin</CardTitle>
              <CardDescription>
                Your exam is unlocked. Read the instructions carefully.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <h3 className="font-semibold">Exam Rules:</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="size-4 text-green-600 mt-0.5 shrink-0" />
                    <span>{config.demoQuestionCount} questions (Demo Mode)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock className="size-4 text-blue-600 mt-0.5 shrink-0" />
                    <span>{config.timePerQuestion} seconds per question</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="size-4 text-yellow-600 mt-0.5 shrink-0" />
                    <span>No back navigation allowed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">+{config.marksPerCorrect}</span>
                    <span>marks for correct answer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-600 font-bold">{config.marksPerWrong}</span>
                    <span>marks for wrong answer</span>
                  </li>
                </ul>
              </div>

              <Button
                className="w-full institutional-gradient"
                size="lg"
                onClick={() => setShowConfirmStart(true)}
              >
                <Play className="size-5 mr-2" />
                Start Examination
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Exam Phase - Error (No Questions) */}
        {phase === 'exam' && (questions.length === 0 || !currentQuestion || !currentQuestion.options) && (
          <Card className="max-w-lg mx-auto border-red-200 bg-red-50/30">
            <CardHeader className="text-center">
              <div className="mx-auto size-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="size-8 text-red-600" />
              </div>
              <CardTitle className="font-serif text-2xl text-red-800">Exam Error</CardTitle>
              <CardDescription className="text-red-700">
                {questions.length === 0
                  ? `We could not find any exam questions for Class ${currentStudent.class}.`
                  : 'An error occurred while loading the question.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-red-600 mb-4">
                Please try refreshing the page or contact support.
              </p>
              <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full">
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {phase === 'exam' && questions.length > 0 && currentQuestion && currentQuestion.options && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-serif text-xl font-bold">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </h1>
                <p className="text-sm text-muted-foreground">{currentQuestion.subject}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Current Score</p>
                <p className={`text-2xl font-bold ${score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {score}
                </p>
              </div>
            </div>

            {/* Progress */}
            <Progress value={(currentQuestionIndex / questions.length) * 100} className="h-2" />

            {/* Timer */}
            <Card className={`border-2 ${timeLeft <= 2 ? 'border-red-500 animate-pulse-border' : 'border-primary'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-center gap-3">
                  <Clock className={`size-6 ${timeLeft <= 2 ? 'text-red-500' : 'text-primary'}`} />
                  <span className={`exam-timer ${timeLeft <= 2 ? 'text-red-500 animate-timer-pulse' : 'text-primary'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Question */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-medium mb-4">{currentQuestion.questionText}</h2>

                {currentQuestion.questionFileUrl && (
                  <div className="mb-6">
                    {currentQuestion.questionFileUrl.startsWith('data:image') || /\.(jpeg|jpg|gif|png)(\?.*)?$/i.test(currentQuestion.questionFileUrl) ? (
                      <img
                        src={currentQuestion.questionFileUrl}
                        alt="Question Attachment"
                        className="max-w-full h-auto max-h-[300px] rounded-md border mx-auto"
                      />
                    ) : (
                      <a
                        href={currentQuestion.questionFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 text-primary hover:underline bg-primary/5 p-3 rounded-md w-full border border-dashed border-primary/20"
                      >
                        <FileText className="size-5" />
                        View Attached Document (PDF)
                      </a>
                    )}
                  </div>
                )}

                <div className="grid gap-3">
                  {currentQuestion.options.map((option, index) => (
                    <Button
                      key={index}
                      variant={selectedAnswer === index ? 'default' : 'outline'}
                      className={`justify-start text-left h-auto py-4 px-4 ${selectedAnswer === index ? 'institutional-gradient' : ''
                        }`}
                      onClick={() => handleAnswerSubmit(index)}
                      disabled={selectedAnswer !== null}
                    >
                      <span className="size-8 rounded-full bg-muted flex items-center justify-center mr-3 shrink-0">
                        {String.fromCharCode(65 + index)}
                      </span>
                      {option}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Correct</p>
                  <p className="text-xl font-bold text-green-600">{correctCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Wrong</p>
                  <p className="text-xl font-bold text-red-600">{wrongCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="text-xl font-bold">{questions.length - currentQuestionIndex - 1}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Gap Phase */}
        {phase === 'gap' && (
          <Card className="max-w-lg mx-auto text-center">
            <CardContent className="p-8">
              <div className="mb-6">
                {selectedAnswer === currentQuestion?.correctOptionIndex ? (
                  <div className="mx-auto size-20 rounded-full bg-green-100 flex items-center justify-center animate-score-pop">
                    <CheckCircle className="size-10 text-green-600" />
                  </div>
                ) : (
                  <div className="mx-auto size-20 rounded-full bg-red-100 flex items-center justify-center animate-score-pop">
                    <XCircle className="size-10 text-red-600" />
                  </div>
                )}
              </div>

              <h2 className="text-2xl font-bold mb-2">
                {selectedAnswer === currentQuestion?.correctOptionIndex ? 'Correct!' :
                  selectedAnswer === null ? 'Time Up!' : 'Incorrect'}
              </h2>

              <p className="text-muted-foreground mb-6">
                {selectedAnswer === currentQuestion?.correctOptionIndex
                  ? `+${config.marksPerCorrect} marks`
                  : selectedAnswer === null
                    ? 'No marks'
                    : `${config.marksPerWrong} marks`}
              </p>

              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-2">Next question in</p>
                <p className="exam-timer text-primary">{formatTime(gapTimeLeft)}</p>
              </div>

              <p className="text-sm text-muted-foreground mt-4">
                Current Score: <span className={`font-bold ${score >= 0 ? 'text-green-600' : 'text-red-600'}`}>{score}</span>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Completed Phase */}
        {phase === 'completed' && (
          <Card className="max-w-lg mx-auto text-center">
            <CardHeader>
              <div className="mx-auto size-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CheckCircle className="size-10 text-primary" />
              </div>
              <CardTitle className="font-serif text-2xl">Exam Completed!</CardTitle>
              <CardDescription>
                Your responses have been recorded successfully
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {score !== 0 && (
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Final Score</p>
                  <p className={`text-4xl font-bold ${score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {score}
                  </p>
                </div>
              )}

              <Button
                className="w-full institutional-gradient"
                onClick={() => navigate('/dashboard/results')}
              >
                View Detailed Results
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/dashboard/certificates')}
              >
                <Award className="size-4 mr-2" />
                Download Certificate
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Confirm Start Dialog */}
        <AlertDialog open={showConfirmStart} onOpenChange={setShowConfirmStart}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start Examination?</AlertDialogTitle>
              <AlertDialogDescription>
                Once started, you cannot pause or restart the exam. The timer will begin immediately.
                Are you sure you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={startExamHandler}>
                Yes, Start Exam
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* ... existing code ... */}

        {/* Fallback for Unknown Phase */}
        {!['approval', 'payment', 'ready', 'exam', 'gap', 'completed'].includes(phase) && (
          <div className="p-4 bg-red-100 text-red-800 rounded">
            Error: Unknown Exam Phase "{phase}"
          </div>
        )}

        {/* Debug Info (Remove in production) */}
        <div className="mt-8 p-4 bg-slate-100 rounded text-xs font-mono text-muted-foreground">
          <p>Debug Info:</p>
          <p>Phase: {phase}</p>
          <p>Student ID: {currentStudent.id}</p>
          <p>Class: {currentStudent.class} ({typeof currentStudent.class})</p>
          <p>Questions Available: {questions.length}</p>
          <p>Current Question Index: {currentQuestionIndex}</p>
          <p>Current Question: {currentQuestion ? 'Loaded' : 'Null'}</p>
          <p>Config Loaded: {config ? 'Yes' : 'No'}</p>
          <p>Config DemoCount: {config?.demoQuestionCount}</p>
        </div>
      </div>
    </div>
  );
}
