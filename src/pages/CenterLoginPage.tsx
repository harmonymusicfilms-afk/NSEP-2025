import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Lock, Mail, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores';
import { APP_CONFIG } from '@/constants/config';

export function CenterLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { loginCenter } = useAuthStore();
    const { toast } = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            toast({
                title: 'Error',
                description: 'Please enter both email and password.',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);
        try {
            await loginCenter(email, password);
            toast({
                title: 'Login Successful',
                description: 'Welcome to your center dashboard!',
            });
            navigate('/center/dashboard');
        } catch (error: any) {
            console.error('Center login error:', error);
            let errorMessage = 'Invalid email or password.';

            if (error.message) {
                if (error.message.includes('not activated') || error.message.includes('payment')) {
                    errorMessage = 'Your center is not activated. Please complete ₹500 payment first.';
                } else if (error.message.includes('not found')) {
                    errorMessage = 'No center found with this email. Please register first.';
                } else {
                    errorMessage = error.message;
                }
            }

            toast({
                title: 'Login Failed',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
            <Link to="/" className="flex items-center gap-2 mb-8 group">
                <div className="size-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                    <Building2 className="size-6" />
                </div>
                <div>
                    <h1 className="font-serif text-2xl font-bold text-foreground leading-tight">
                        {APP_CONFIG.shortName} <span className="text-amber-600">Centers</span>
                    </h1>
                    <p className="text-xs text-muted-foreground">Authorized Center Portal</p>
                </div>
            </Link>

            <Card className="w-full max-w-md shadow-xl border-t-4 border-t-amber-600">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Center Login</CardTitle>
                    <CardDescription className="text-center">
                        Access your referral dashboard and rewards
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Official Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    className="pl-10"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <Link
                                    to="/forgot-password?type=center"
                                    className="text-xs text-amber-600 hover:underline"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-10"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4">
                        <Button
                            type="submit"
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-6"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                'Sign In to Dashboard'
                            )}
                        </Button>
                        <div className="text-center text-sm text-muted-foreground mt-4">
                            Don't have a center account?{' '}
                            <Link to="/center-registration" className="text-amber-600 font-semibold hover:underline">
                                Apply Now
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>

            <Button variant="ghost" asChild className="mt-8">
                <Link to="/">
                    <ArrowLeft className="mr-2 size-4" />
                    Back to NSEP Home
                </Link>
            </Button>
        </div>
    );
}
