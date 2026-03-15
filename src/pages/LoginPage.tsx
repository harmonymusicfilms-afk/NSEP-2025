import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, LogIn, AlertCircle, Loader2, Building2, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore, useStudentStore } from '@/stores';
import { APP_CONFIG } from '@/constants/config';
import { isValidEmail, isValidMobile } from '@/lib/utils';

import { client as backend } from '@/lib/backend';

type LoginType = 'student' | 'center' | 'admin';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginType, setLoginType] = useState<LoginType>('student');

  const navigate = useNavigate();
  const { toast } = useToast();
  const { loginStudent, loginCenter, loginAdmin, isStudentLoggedIn } = useAuthStore();
  const { loadStudents, addStudent } = useStudentStore();

  useEffect(() => {
    loadStudents();
    if (isStudentLoggedIn) {
      navigate('/dashboard');
    }
  }, [isStudentLoggedIn, navigate, loadStudents]);

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);

    try {
      const { data, error } = await backend.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('No user found');

      // Handle based on login type
      if (loginType === 'admin') {
        // Admin login - check admins table
        const { data: adminData, error: adminError } = await backend
          .from('admins')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (adminData) {
          toast({
            title: 'Admin Login Successful',
            description: 'Welcome to the admin dashboard!',
          });
          navigate('/admin/dashboard');
          return;
        } else {
          throw new Error('Admin account not found');
        }
      } else if (loginType === 'center') {
        // Center login - check centers table
        const { data: centerData, error: centerError } = await backend
          .from('centers')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (centerData) {
          if (centerData.status !== 'APPROVED') {
            throw new Error('Your center account is pending approval');
          }
          toast({
            title: 'Center Login Successful',
            description: `Welcome, ${centerData.name}!`,
          });
          navigate('/center/dashboard');
          return;
        } else {
          throw new Error('Center account not found');
        }
      } else {
        // Student login - check students table
        const { data: studentData, error: studentError } = await backend
          .from('students')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (studentData) {
          let loggedIn = await loginStudent(email.toLowerCase().trim(), studentData.mobile);

          if (!loggedIn) {
            await addStudent({
              name: studentData.name,
              fatherName: studentData.father_name,
              class: studentData.class || studentData.class_level,
              mobile: studentData.mobile,
            }, data.user.id);

            loggedIn = await loginStudent(studentData.email, studentData.mobile);
          }

          toast({
            title: 'Login Successful',
            description: `Welcome back, ${studentData.name}!`,
          });
          navigate('/dashboard');
        } else {
          throw new Error('Student profile not found');
        }
      }

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message || 'Invalid credentials.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="bg-background rounded-[3rem] p-8 lg:p-12 border border-border shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-[60px] -z-10" />

          <div className="text-center mb-10">
            <Link to="/" className="inline-flex items-center justify-center gap-3 text-primary mb-6 group">
              <div className="p-3 bg-primary/10 rounded-2xl group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(33,150,243,0.2)]">
                <GraduationCap className="size-8" />
              </div>
              <span className="text-2xl font-black text-foreground tracking-tighter">{APP_CONFIG.shortName}</span>
            </Link>

            {/* Login Type Tabs */}
            <div className="flex justify-center gap-2 mb-6">
              <button
                type="button"
                onClick={() => setLoginType('student')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${loginType === 'student'
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
              >
                <GraduationCap className="size-4" />
                Student
              </button>
              <button
                type="button"
                onClick={() => setLoginType('center')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${loginType === 'center'
                  ? 'bg-amber-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
              >
                <Building2 className="size-4" />
                Center
              </button>
              <button
                type="button"
                onClick={() => setLoginType('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${loginType === 'admin'
                  ? 'bg-red-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
              >
                <Shield className="size-4" />
                Admin
              </button>
            </div>

            <h1 className="text-3xl font-black text-foreground mb-2">
              {loginType === 'student' ? 'Student Access' : loginType === 'center' ? 'Center Login' : 'Admin Login'}
            </h1>
            <p className="text-muted-foreground font-bold italic">Enter your credentials to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-muted-foreground font-black ml-1 uppercase tracking-widest text-[10px]">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="your@email.com"
                className={`h-14 bg-input border-border rounded-2xl text-foreground focus:border-primary/50 transition-all placeholder:text-muted-foreground ${errors.email ? 'border-destructive' : ''}`}
              />
              {errors.email && (
                <p className="text-xs text-red-500 font-bold flex items-center gap-1 ml-1">
                  <AlertCircle className="size-3" /> {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" title="Password" className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-[10px] text-primary hover:text-primary-light font-black uppercase tracking-widest"
                >
                  Forgot?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="••••••••"
                className={`h-14 bg-input border-border rounded-2xl text-foreground focus:border-primary/50 transition-all placeholder:text-muted-foreground ${errors.password ? 'border-destructive' : ''}`}
              />
              {errors.password && (
                <p className="text-xs text-red-500 font-bold flex items-center gap-1 ml-1">
                  <AlertCircle className="size-3" /> {errors.password}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-16 rounded-2xl institutional-gradient text-white font-black text-lg shadow-[0_0_20px_rgba(255,165,0,0.3)] hover:scale-[1.02] transition-transform"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin size-5" />
                  Verifying...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="size-5" />
                  Enter Account
                </span>
              )}
            </Button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
              No account?{' '}
              <Link to="/register" className="text-primary hover:text-primary-light transition-colors">
                Register Securely
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
