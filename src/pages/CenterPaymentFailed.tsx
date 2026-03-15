import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AlertCircle, Loader2, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { client as backend } from '@/lib/backend';

export function CenterPaymentFailed() {
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const [isChecking, setIsChecking] = useState(false);
    const [centerCode, setCenterCode] = useState('');
    const [canRetry, setCanRetry] = useState(false);

    // Extract center code from location state or query params
    const centerCodeFromState = location.state?.centerCode;
    const centerCodeFromParams = new URLSearchParams(location.search).get('centerCode');

    // Use center code from state, params, or generate a placeholder
    const initialCenterCode = centerCodeFromState || centerCodeFromParams || 'CTRXXXX';

    useEffect(() => {
        // Check if payment might have succeeded despite failure redirect
        const checkPaymentStatus = async () => {
            if (initialCenterCode && initialCenterCode !== 'CTRXXXX') {
                setIsChecking(true);
                try {
                    const { data, error } = await backend
                        .from('centers')
                        .select('center_code, status, payment_status')
                        .eq('center_code', initialCenterCode)
                        .single();

                    if (error) throw error;

                    if (data && data.status === 'active' && data.payment_status === 'paid') {
                        // Payment actually succeeded, redirect to success page
                        navigate(`/center/payment-success?centerCode=${data.center_code}`, {
                            replace: true
                        });
                        return;
                    }

                    // Allow retry if payment is still unpaid
                    setCanRetry(data.payment_status === 'unpaid');
                } catch (error) {
                    console.error('Payment status check error:', error);
                } finally {
                    setIsChecking(false);
                }
            }
        };

        checkPaymentStatus();
    }, [initialCenterCode, navigate, toast]);

    const handleRetry = async () => {
        setIsChecking(true);
        try {
            // Create a new Razorpay order for retry
            const { data: orderData, error: orderError } = await backend.functions.invoke('create-razorpay-order', {
                body: {
                    amount: 50000, // ₹500 in paisa
                    currency: 'INR',
                    receipt: `center_${initialCenterCode}_retry`,
                    notes: {
                        center_code: initialCenterCode,
                        retry: true
                    }
                }
            });

            if (orderError) throw orderError;

            // Load Razorpay script and open payment modal
            const { loadRazorpayScript, RAZORPAY_CONFIG } = await import('@/constants/razorpay');
            const razorpayLoaded = await loadRazorpayScript();
            if (!razorpayLoaded) {
                throw new Error('Failed to load Razorpay script');
            }

            // @ts-ignore - Razorpay is loaded globally
            const razorpayInstance = new (window as any).Razorpay({
                key: RAZORPAY_CONFIG.keyId,
                amount: 50000,
                currency: 'INR',
                name: RAZORPAY_CONFIG.name,
                description: RAZORPAY_CONFIG.description,
                image: RAZORPAY_CONFIG.logo,
                order_id: orderData.id,
                handler: async (response: any) => {
                    // Handle successful payment
                    try {
                        // Verify payment signature on backend
                        const { data: verifyData, error: verifyError } = await backend.functions.invoke('verify-razorpay-payment', {
                            body: {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            }
                        });

                        if (verifyError) {
                            throw verifyError;
                        }

                        // Update payment status in centers table
                        await backend.from('centers')
                            .update({ payment_status: 'paid', status: 'active' })
                            .eq('center_code', initialCenterCode);

                        // Save payment details
                        await backend.from('center_payments').insert([{
                            center_id: (await backend.from('centers').select('id').eq('center_code', initialCenterCode).single()).data.id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            amount: 500,
                            status: 'success'
                        }]);

                        navigate(`/center/payment-success?centerCode=${initialCenterCode}`, {
                            replace: true
                        });
                    } catch (verifyError) {
                        console.error('Payment Verification Error:', verifyError);
                        toast({
                            title: 'Payment Verification Failed',
                            description: 'Payment verification failed. Please contact support.',
                            variant: 'destructive',
                        });
                    }
                },
                prefill: {
                    name: location.state?.ownerName || '',
                    email: location.state?.ownerEmail || '',
                    contact: location.state?.ownerPhone || ''
                },
                theme: RAZORPAY_CONFIG.theme
            });

            razorpayInstance.open();
        } catch (error) {
            console.error('Retry payment error:', error);
            toast({
                title: 'Error',
                description: 'Failed to initiate retry payment. Please try again later.',
                variant: 'destructive',
            });
        } finally {
            setIsChecking(false);
        }
    };

    if (isChecking) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6 text-center">
                        <Loader2 className="size-12 text-blue-500 mx-auto mb-4 animate-spin" />
                        <h2 className="text-2xl font-bold mb-2">Checking Payment Status...</h2>
                        <p className="text-gray-600 mb-4">
                            We're checking if your payment went through. This should take just a moment.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
            <Card className="max-w-md w-full">
                <CardContent className="pt-6 text-center">
                    <AlertCircle className="size-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Payment Failed</h2>
                    <p className="text-gray-600 mb-4">
                        We couldn't process your payment. Please try again or contact support if the issue persists.
                    </p>
                    <div className="bg-red-50 p-4 rounded-lg mb-4">
                        <p className="text-sm text-gray-600">Your Center Code:</p>
                        <p className="text-3xl font-bold text-red-600">{initialCenterCode}</p>
                    </div>

                    {canRetry ? (
                        <Button onClick={handleRetry} className="w-full mb-2">
                            Try Payment Again
                        </Button>
                    ) : null}

                    <div className="space-y-4">
                        <Button
                            variant="outline"
                            onClick={() => navigate(`/center/login`)}
                            className="w-full"
                        >
                            Go to Login
                        </Button>
                        <Link to="/" className="text-gray-600 hover:underline w-full block text-center">
                            Return to Home
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}