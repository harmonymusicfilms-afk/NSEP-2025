import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, User, MapPin, Phone, Mail, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { client as backend } from '@/lib/backend';

export function SimpleCenterRegistrationPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');

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

            const { error } = await backend.from('centers').insert([{
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
            }]);

            if (error) {
                console.error('Error:', error);
                toast({
                    title: 'Error',
                    description: error.message,
                    variant: 'destructive',
                });
                setIsLoading(false);
                return;
            }

            setGeneratedCode(code);
            setIsSuccess(true);
            toast({
                title: 'Success',
                description: 'Center registered successfully!',
            });
        } catch (err: any) {
            console.error('Error:', err);
            toast({
                title: 'Error',
                description: err.message || 'Something went wrong',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6 text-center">
                        <CheckCircle className="size-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Registration Successful!</h2>
                        <p className="text-gray-600 mb-4">
                            Your center has been registered. Admin will review and approve your request.
                        </p>
                        <div className="bg-blue-50 p-4 rounded-lg mb-4">
                            <p className="text-sm text-gray-600">Your Center Code:</p>
                            <p className="text-3xl font-bold text-blue-600">{generatedCode}</p>
                        </div>
                        <Link to="/">
                            <Button>Go to Home</Button>
                        </Link>
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
                    Already registered? <Link to="/center-login" className="text-blue-600 hover:underline">Login here</Link>
                </p>
            </div>
        </div>
    );
}
