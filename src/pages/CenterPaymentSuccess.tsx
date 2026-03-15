import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { client as backend } from '@/lib/backend';

export function CenterPaymentSuccess() {
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const [isVerifying, setIsVerifying] = useState(false);
    const [centerCode, setCenterCode] = useState('');

    // Extract center code from location state or query params
    const centerCodeFromState = location.state?.centerCode;
    const centerCodeFromParams = new URLSearchParams(location.search).get('centerCode');

    // Use center code from state, params, or generate a placeholder
    const initialCenterCode = centerCodeFromState || centerCodeFromParams || 'CTRXXXX';

    useEffect(() => {
        // Verify payment status in background
        const verifyPayment = async () => {
            if (initialCenterCode && initialCenterCode !== 'CTRXXXX') {
                setIsVerifying(true);
                try {
                    const { data, error } = await backend
                        .from('centers')
                        .select('center_code, status, payment_status')
                        .eq('center_code', initialCenterCode)
                        .single();

                    if (error) throw error;

                    if (data && data.status === 'active' && data.payment_status === 'paid') {
                        setCenterCode(data.center_code);
                        toast({
                            title: 'Payment Verified!',
                            description: 'Your center has been successfully activated.',
                        });
                    } else {
                        toast({
                            title: 'Payment Pending',
                            description: 'Your payment is still being processed. Please wait a moment.',
                            variant: 'default',
                        });
                    }
                } catch (error) {
                    console.error('Payment verification error:', error);
                    toast({
                        title: 'Verification Error',
                        description: 'Unable to verify payment status. Please contact support.',
                        variant: 'destructive',
                    });
                } finally {
                    setIsVerifying(false);
                }
            }
        };

        verifyPayment();
    }, [initialCenterCode, navigate, toast]);

    if (isVerifying && !centerCode) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6 text-center">
                        <Loader2 className="size-12 text-blue-500 mx-auto mb-4 animate-spin" />
                        <h2 className="text-2xl font-bold mb-2">Verifying Payment...</h2>
                        <p className="text-gray-600 mb-4">
                            We're verifying your payment status. This should take just a moment.
                        </p>
                        <p className="text-sm text-gray-500">
                            Center Code: {initialCenterCode}
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
                    <CheckCircle className="size-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
                    <p className="text-gray-600 mb-4">
                        Your center has been activated successfully.
                    </p>
                    <div className="bg-blue-50 p-4 rounded-lg mb-4">
                        <p className="text-sm text-gray-600">Your Center Code:</p>
                        <p className="text-3xl font-bold text-blue-600">{centerCode || initialCenterCode}</p>
                    </div>
                    <div className="space-y-4">
                        <Link to="/center/login">
                            <Button>Go to Login</Button>
                        </Link>
                        <Link to="/" className="text-gray-600 hover:underline">
                            Return to Home
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}