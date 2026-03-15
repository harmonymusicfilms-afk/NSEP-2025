import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores';
import { client as backend } from '@/lib/backend';

const courseOptions = [
    'Class 5',
    'Class 6',
    'Class 7',
    'Class 8',
    'Class 9',
    'Class 10',
    'Class 11',
    'Class 12',
];

export function CenterAddStudentPage() {
    const { currentCenter } = useAuthStore();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [formData, setFormData] = useState({
        studentName: '',
        email: '',
        phone: '',
        course: '',
        fatherName: '',
        schoolName: '',
    });

    const [errors, setErrors] = useState<{
        studentName?: string;
        email?: string;
        phone?: string;
        course?: string;
        fatherName?: string;
        schoolName?: string;
    }>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate form
        const newErrors: typeof errors = {};
        if (!formData.studentName.trim()) {
            newErrors.studentName = 'Student name is required';
        }
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }
        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone number is required';
        } else if (!/^\d{10}$/.test(formData.phone)) {
            newErrors.phone = 'Phone must be 10 digits';
        }
        if (!formData.course) {
            newErrors.course = 'Please select a class';
        }
        if (!formData.fatherName.trim()) newErrors.fatherName = "Father's name is required";
        if (!formData.schoolName.trim()) newErrors.schoolName = 'School name is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});

        if (!currentCenter) {
            toast({
                title: 'Error',
                description: 'You must be logged in as a center to add students.',
                variant: 'destructive',
            });
            return;
        }

        // Validate center is active and paid
        if (!currentCenter || currentCenter.status !== 'APPROVED') {
            toast({
                title: 'Access Denied',
                description: 'Your center registration is pending approval. Please wait for admin approval.',
                variant: 'destructive',
            });
            return;
        }

        if (currentCenter.payment_status !== 'paid' && currentCenter.paymentStatus !== 'paid') {
            toast({
                title: 'Payment Required',
                description: 'Your center must complete the ₹500 registration fee to add students.',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);

        try {
            // Extract class level from course
            const classLevel = parseInt(formData.course.replace('Class ', ''));

            // Check for existing student with same email or phone
            const { data: existingStudent } = await backend
                .from('students')
                .select('id')
                .or('email.eq.:email,phone.eq.:phone', { email: formData.email, phone: formData.phone })
                .maybeSingle();

            if (existingStudent) {
                toast({
                    title: 'Duplicate Entry',
                    description: 'A student with this email or phone already exists.',
                    variant: 'destructive',
                });
                setIsLoading(false);
                return;
            }

            // Insert student with center_id
            const { error: insertError } = await backend.from('students').insert([{
                center_id: currentCenter.id,
                student_name: formData.studentName,
                father_name: formData.fatherName,
                email: formData.email,
                phone: formData.phone,
                course: formData.course,
                class_level: classLevel,
                school_name: formData.schoolName,
                center_code: currentCenter.centerCode,
                referred_by_center_code: currentCenter.centerCode,
                status: 'pending',
                payment_status: 'pending',
            }]);

            if (insertError) {
                console.error('Insert Error:', insertError);
                toast({
                    title: 'Error',
                    description: insertError.message || 'Failed to add student. Please try again.',
                    variant: 'destructive',
                });
                setIsLoading(false);
                return;
            }

            setIsSuccess(true);
            toast({
                title: 'Student Added',
                description: 'Student has been registered successfully.',
            });

            // Reset form after success
            setFormData({
                studentName: '',
                email: '',
                phone: '',
                course: '',
                fatherName: '',
                schoolName: '',
            });

        } catch (err: any) {
            console.error('Error:', err);
            toast({
                title: 'Error',
                description: err.message || 'Something went wrong.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="p-6 max-w-md mx-auto">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <CheckCircle className="size-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Student Added Successfully!</h2>
                        <p className="text-gray-600 mb-6">
                            The student has been registered under your center.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Button variant="outline" onClick={() => navigate('/center/students')}>
                                View Students
                            </Button>
                            <Button onClick={() => setIsSuccess(false)}>
                                Add Another
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <Button
                variant="ghost"
                className="mb-4"
                onClick={() => navigate('/center/dashboard')}
            >
                <ArrowLeft className="size-4 mr-2" />
                Back to Dashboard
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="size-5" />
                        Add New Student
                    </CardTitle>
                    <CardDescription>
                        Register a new student under your center. They will need to complete payment for exam registration.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="studentName">Student Name *</Label>
                                <Input
                                    id="studentName"
                                    name="studentName"
                                    placeholder="Enter student name"
                                    value={formData.studentName}
                                    onChange={handleChange}
                                    required
                                />
                                {errors.studentName && <p className="text-xs text-destructive">{errors.studentName}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fatherName">Father's Name</Label>
                                <Input
                                    id="fatherName"
                                    name="fatherName"
                                    placeholder="Enter father's name"
                                    value={formData.fatherName}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address *</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="student@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number *</Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    placeholder="9876543210"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    required
                                />
                                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="course">Class *</Label>
                                <Select
                                    value={formData.course}
                                    onValueChange={(value) => setFormData({ ...formData, course: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {courseOptions.map((course) => (
                                            <SelectItem key={course} value={course}>
                                                {course}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.course && <p className="text-xs text-destructive">{errors.course}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="schoolName">School Name</Label>
                                <Input
                                    id="schoolName"
                                    name="schoolName"
                                    placeholder="Enter school name"
                                    value={formData.schoolName}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="size-4 mr-2 animate-spin" />
                                        Adding Student...
                                    </>
                                ) : (
                                    'Add Student'
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
