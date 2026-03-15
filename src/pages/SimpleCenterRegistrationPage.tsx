import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, User, MapPin, Phone, Mail, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { client as backend } from '@/lib/backend';
import { loadRazorpayScript, RAZORPAY_CONFIG } from '@/constants/razorpay';

export function SimpleCenterRegistrationPage() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isPaymentPending, setIsPaymentPending] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');
    const [razorpayOrderId, setRazorpayOrderId] = useState('');

    const [formData, setFormData] = useState({
        centerName: '',
        centerType: '',
        ownerName: '',
        ownerPhone: '',
        ownerEmail: '',
        address: '',
        village: '',
        block: '',
        district: '',
        state: '',
        pincode: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Generate simple code
            const code = 'CTR' + Math.floor(1000 + Math.random() * 9000);

            // First, register the center with pending payment status
            const { error: registerError } = await backend.from('centers').insert([{
                center_name: formData.centerName,
                center_type: formData.centerType,
                owner_name: formData.ownerName,
                owner_mobile: formData.ownerPhone,
                owner_email: formData.ownerEmail,
                center_address: formData.address,
                village: formData.village,
                block: formData.block,
                district: formData.district,
                state: formData.state,
                pincode: formData.pincode,
                center_code: code,
                status: 'PENDING',
                payment_status: 'unpaid',
            }]);

            if (registerError) {
                console.error('Registration Error:', registerError);
                toast({
                    title: 'Error',
                    description: registerError.message,
                    variant: 'destructive',
                });
                setIsLoading(false);
                return;
            }

            setGeneratedCode(code);

            // Create Razorpay order for ₹500 (50000 paisa)
            const { data: orderData, error: orderError } = await backend.functions.invoke('create-razorpay-order', {
                body: {
                    amount: 50000, // ₹500 in paisa
                    currency: 'INR',
                    receipt: `center_${code}`,
                    notes: {
                        center_code: code,
                        center_name: formData.centerName,
                        owner_email: formData.ownerEmail
                    }
                }
            });

            if (orderError) {
                console.error('Order Creation Error:', orderError);
                toast({
                    title: 'Error',
                    description: 'Failed to create payment order. Please try again.',
                    variant: 'destructive',
                });
                setIsLoading(false);
                return;
            }

            setIsPaymentPending(true);
            setRazorpayOrderId(orderData.id);

            // Load Razorpay script and open payment modal
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
                            .eq('center_code', code);

                        // Save payment details
                        await backend.from('center_payments').insert([{
                            center_id: (await backend.from('centers').select('id').eq('center_code', code).single()).data.id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            amount: 500,
                            status: 'success'
                        }]);

                        setIsPaymentPending(false);
                        // Navigate to success page
                        navigate(`/center/payment-success?centerCode=${code}`, { replace: true });
                    } catch (verifyError) {
                        console.error('Payment Verification Error:', verifyError);
                        toast({
                            title: 'Payment Verification Failed',
                            description: 'Payment verification failed. Please contact support.',
                            variant: 'destructive',
                        });

                        // Update payment status as failed
                        await backend.from('center_payments').insert([{
                            center_id: (await backend.from('centers').select('id').eq('center_code', code).single()).data.id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            amount: 500,
                            status: 'failed'
                        }]);

                        // Navigate to failure page
                        navigate(`/center/payment-failed?centerCode=${code}`, { replace: true });
                    }
                },
                prefill: {
                    name: formData.ownerName,
                    email: formData.ownerEmail,
                    contact: formData.ownerPhone
                },
                theme: RAZORPAY_CONFIG.theme
            });

            razorpayInstance.open();
        } catch (err: any) {
            console.error('Error:', err);
            toast({
                title: 'Error',
                description: err.message || 'Something went wrong',
                variant: 'destructive',
            });
            setIsLoading(false);
        } finally {
            // Only set loading to false if we're not waiting for payment
            if (!isPaymentPending) {
                setIsLoading(false);
            }
        }
    };

    if (isSuccess && !isPaymentPending) {
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
                            <p className="text-3xl font-bold text-blue-600">{generatedCode}</p>
                        </div>
                        <Link to="/center/login">
                            <Button>Go to Login</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Show payment pending state
    if (isPaymentPending) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6 text-center">
                        <Loader2 className="size-12 text-blue-500 mx-auto mb-4 animate-spin" />
                        <h2 className="text-2xl font-bold mb-2">Processing Payment...</h2>
                        <p className="text-gray-600 mb-4">
                            Please complete the payment to activate your center.
                        </p>
                        <p className="text-sm text-gray-500">
                            Center Code: {generatedCode}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Register Your Center</h1>
                    <p className="text-gray-600 mt-2">Join our scholarship program as a center</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Center Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Center Details */}
                            <div className="space-y-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Building2 className="size-5" /> Center Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label>Center Name *</Label>
                                        <Input
                                            name="centerName"
                                            value={formData.centerName}
                                            onChange={handleChange}
                                            placeholder="Enter center name"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label>Center Type *</Label>
                                        <Select onValueChange={(v) => setFormData({ ...formData, centerType: v })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="School">School</SelectItem>
                                                <SelectItem value="Coaching Center">Coaching Center</SelectItem>
                                                <SelectItem value="Tuition Center">Tuition Center</SelectItem>
                                                <SelectItem value="NGO">NGO</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* Owner Details */}
                            <div className="space-y-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <User className="size-5" /> Owner Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label>Owner Name *</Label>
                                        <Input
                                            name="ownerName"
                                            value={formData.ownerName}
                                            onChange={handleChange}
                                            placeholder="Enter owner name"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label>Mobile Number *</Label>
                                        <Input
                                            name="ownerPhone"
                                            value={formData.ownerPhone}
                                            onChange={handleChange}
                                            placeholder="Enter mobile number"
                                            required
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <Label>Email *</Label>
                                        <Input
                                            name="ownerEmail"
                                            type="email"
                                            value={formData.ownerEmail}
                                            onChange={handleChange}
                                            placeholder="Enter email address"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Address */}
                            <div className="space-y-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <MapPin className="size-5" /> Address
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <Label>Full Address *</Label>
                                        <Input
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            placeholder="Enter full address"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <Label>Village/Town</Label>
                                            <Input
                                                name="village"
                                                value={formData.village}
                                                onChange={handleChange}
                                                placeholder="Village"
                                            />
                                        </div>
                                        <div>
                                            <Label>Block</Label>
                                            <Input
                                                name="block"
                                                value={formData.block}
                                                onChange={handleChange}
                                                placeholder="Block"
                                            />
                                        </div>
                                        <div>
                                            <Label>District *</Label>
                                            <Input
                                                name="district"
                                                value={formData.district}
                                                onChange={handleChange}
                                                placeholder="District"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <Label>PIN Code</Label>
                                            <Input
                                                name="pincode"
                                                value={formData.pincode}
                                                onChange={handleChange}
                                                placeholder="PIN"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>State *</Label>
                                        <Input
                                            name="state"
                                            value={formData.state}
                                            onChange={handleChange}
                                            placeholder="State"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Submitting...' : 'Submit Registration'}
                                <ArrowRight className="ml-2 size-4" />
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-center mt-4 text-gray-600">
                    Already registered? <Link to="/center/login" className="text-blue-600 hover:underline">Login here</Link>
                </p>
            </div>
        </div>
    );
}
