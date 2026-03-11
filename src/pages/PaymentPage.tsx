import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, usePaymentRequestStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Image as ImageIcon, Loader2, CheckCircle, AlertCircle, Copy, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { client as backend } from '@/lib/backend';

const PAYMENT_CONFIG = {
  upiId: 'gphdm2025@okaxis', // Change this to actual UPI ID
  bankName: 'Axis Bank',
  accountName: 'GPHDM National Scholarship Exam',
  accountNumber: '9234567890XXXXXX',
  ifscCode: 'UTIB0002345',
  bankAddress: 'Main Branch, Lucknow, Uttar Pradesh',
};

interface PaymentPageProps {
  studentId: string;
  studentName: string;
  amount: number;
  className: string;
  onPaymentSubmitted?: (paymentRequestId: string) => void;
}

export function PaymentPage({ studentId, studentName, amount, className, onPaymentSubmitted }: PaymentPageProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentStudent } = useAuthStore();

  const [transactionId, setTransactionId] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedPaymentId, setSubmittedPaymentId] = useState<string>('');

  // Generate QR code using online service
  React.useEffect(() => {
    const upiString = `upi://pay?pa=${PAYMENT_CONFIG.upiId}&pn=${encodeURIComponent(PAYMENT_CONFIG.accountName)}&am=${amount}`;
    // Use a simple QR code generation service
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiString)}`;
    setQrCode(qrUrl);
  }, [amount]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Screenshot must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    setProofFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!transactionId.trim()) {
      toast({
        title: 'Transaction ID required',
        description: 'Please enter the transaction ID from your payment',
        variant: 'destructive',
      });
      return;
    }

    if (!proofFile) {
      toast({
        title: 'Screenshot required',
        description: 'Please upload a screenshot of the payment proof',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload proof file to storage
      const fileName = `payment-proofs/${studentId}-${Date.now()}-${proofFile.name}`;
      const { data: uploadData, error: uploadError } = await backend.storage
        .from('payment-proofs')
        .upload(fileName, proofFile);

      if (uploadError) {
        throw new Error(uploadError.message || 'Failed to upload proof');
      }

      // Get public URL
      const { data: publicUrl } = backend.storage.from('payment-proofs').getPublicUrl(fileName);
      const proofUrl = publicUrl?.publicUrl || '';

      // Create payment request in database
      const { data: paymentData, error: paymentError } = await backend.database.from('payment_requests').insert([
        {
          student_id: studentId,
          amount: amount,
          class_level: className,
          transaction_id: transactionId,
          proof_url: proofUrl,
          status: 'PENDING_REVIEW',
          submitted_at: new Date().toISOString(),
          student_name: studentName,
        },
      ]).select();

      if (paymentError) {
        throw new Error(paymentError.message || 'Failed to create payment request');
      }

      const paymentId = paymentData?.[0]?.id;
      setSubmittedPaymentId(paymentId);
      setSubmitted(true);

      toast({
        title: 'Payment submitted',
        description: 'Your payment proof has been submitted for verification. You will receive confirmation within 24 hours.',
      });

      if (onPaymentSubmitted && paymentId) {
        onPaymentSubmitted(paymentId);
      }
    } catch (error) {
      console.error('Payment submission error:', error);
      toast({
        title: 'Submission failed',
        description: error instanceof Error ? error.message : 'Failed to submit payment proof',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <CardTitle className="text-center">Payment Submitted</CardTitle>
            <CardDescription className="text-center">Your payment has been submitted successfully</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium text-gray-700">Submission Details</p>
              <div className="space-y-1 text-sm">
                <p className="text-gray-600">
                  <span className="font-semibold">Student:</span> {studentName}
                </p>
                <p className="text-gray-600">
                  <span className="font-semibold">Amount:</span> ₹{amount}
                </p>
                <p className="text-gray-600">
                  <span className="font-semibold">Status:</span> <span className="text-yellow-600 font-semibold">Pending Review</span>
                </p>
                <p className="text-gray-600">
                  <span className="font-semibold">Request ID:</span> {submittedPaymentId.slice(0, 8)}...
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
              <p className="text-sm text-amber-800">
                <AlertCircle className="inline w-4 h-4 mr-2" />
                Your payment will be verified within 24 hours. Check your email for confirmation.
              </p>
            </div>

            <Button onClick={() => navigate('/student/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">
            ← Back
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Payment Details */}
          <div className="space-y-4">
            {/* QR Code */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">UPI Payment QR Code</CardTitle>
                <CardDescription>Scan with any UPI app to pay</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                {qrCode ? (
                  <img src={qrCode} alt="UPI QR Code" className="w-64 h-64 border-4 border-gray-200 rounded-lg p-2" />
                ) : (
                  <div className="w-64 h-64 bg-gray-200 rounded-lg animate-pulse" />
                )}
              </CardContent>
            </Card>

            {/* UPI ID */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">UPI ID</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 bg-gray-100 p-3 rounded-lg">
                  <code className="flex-1 font-mono text-sm font-semibold text-gray-800">{PAYMENT_CONFIG.upiId}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(PAYMENT_CONFIG.upiId);
                      toast({ title: 'Copied to clipboard' });
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Student Name:</span>
                  <span className="font-semibold">{studentName}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Class:</span>
                  <span className="font-semibold">{className}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Exam Fee:</span>
                  <span className="font-semibold">₹{amount}</span>
                </div>
                <div className="flex justify-between py-2 text-lg font-bold text-indigo-600 bg-indigo-50 p-2 rounded-lg">
                  <span>Total Amount:</span>
                  <span>₹{amount}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Bank Details & Form */}
          <div className="space-y-4">
            {/* Bank Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bank Transfer Details</CardTitle>
                <CardDescription>Alternative payment method</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <Label className="text-xs text-gray-600">Bank Name</Label>
                    <p className="font-semibold">{PAYMENT_CONFIG.bankName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Account Name</Label>
                    <p className="font-semibold">{PAYMENT_CONFIG.accountName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Account Number</Label>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm font-semibold">{PAYMENT_CONFIG.accountNumber}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(PAYMENT_CONFIG.accountNumber);
                          toast({ title: 'Copied to clipboard' });
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">IFSC Code</Label>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm font-semibold">{PAYMENT_CONFIG.ifscCode}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(PAYMENT_CONFIG.ifscCode);
                          toast({ title: 'Copied to clipboard' });
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Bank Address</Label>
                    <p className="text-sm">{PAYMENT_CONFIG.bankAddress}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Proof Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upload Payment Proof</CardTitle>
                <CardDescription>After making the payment</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Preview */}
                  {previewUrl && (
                    <div className="relative bg-gray-100 rounded-lg p-2 flex justify-center">
                      <img src={previewUrl} alt="Preview" className="max-h-40 rounded" />
                    </div>
                  )}

                  {/* File Upload */}
                  <div>
                    <Label htmlFor="proof-upload" className="text-sm font-medium">
                      Screenshot of Payment
                    </Label>
                    <input
                      id="proof-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      disabled={isSubmitting}
                      className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Max 5MB • JPG, PNG or WEBP</p>
                    {proofFile && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {proofFile.name}</p>}
                  </div>

                  {/* Transaction ID */}
                  <div>
                    <Label htmlFor="transaction-id" className="text-sm font-medium">
                      Transaction ID / Reference Number
                    </Label>
                    <Input
                      id="transaction-id"
                      placeholder="e.g., UPI123456789 or UTR Number"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      disabled={isSubmitting}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Found in your payment confirmation SMS/email</p>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isSubmitting || !proofFile || !transactionId.trim()}
                    className="w-full"
                  >
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {isSubmitting ? 'Submitting...' : 'Submit Payment Proof'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Help */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-blue-800">
              <p className="font-semibold mb-2">Need Help?</p>
              <ul className="space-y-1 text-xs">
                <li>• Make payment via UPI or bank transfer</li>
                <li>• Take a screenshot of the payment confirmation</li>
                <li>• Note the transaction ID from your bank</li>
                <li>• Upload the screenshot and enter transaction ID</li>
                <li>• Your payment will be verified within 24 hours</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
