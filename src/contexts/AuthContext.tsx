import { createContext, useContext, useEffect, useState } from 'react';
import { AuthSession as Session, UserSchema as User } from '@insforge/sdk';
import { client as backend } from '@/lib/backend';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores';
import { Student } from '@/types';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    student: Student | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [student, setStudent] = useState<Student | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const setStoreStudent = useAuthStore((state) => state.setStudent);
    const setStoreCenter = useAuthStore((state) => state.setCenter);

    useEffect(() => {
        // Get initial session
        backend.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                const role = session.user.metadata?.role as string;
                if (role === 'CENTER') {
                    fetchCenterProfile(session.user.id);
                } else {
                    fetchStudentProfile(session.user.id);
                }
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = backend.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                const role = session.user.metadata?.role as string;
                if (role === 'CENTER') {
                    fetchCenterProfile(session.user.id);
                } else {
                    fetchStudentProfile(session.user.id);
                }
            } else {
                setStudent(null);
                setStoreStudent(null);
                setStoreCenter(null);
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchStudentProfile = async (userId: string) => {
        try {
            const { data, error } = await backend
                .from('students')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching student profile:', error);
                setStudent(null); // Ensure student is null on error
                setStoreStudent(null); // Ensure store student is null on error
            } else {
                // Map backend fields to Student type
                if (data) {
                    const studentData: Student = {
                        id: data.id,
                        name: data.name,
                        fatherName: data.father_name,
                        class: data.class_level || data.class || 0, // Map renamed column
                        mobile: data.mobile,
                        email: data.email,
                        schoolName: data.school_name,
                        schoolContact: data.school_contact,
                        addressVillage: data.address_village,
                        addressBlock: data.address_block,
                        addressTahsil: data.address_tahsil,
                        addressDistrict: data.address_district,
                        addressState: data.address_state,
                        photoUrl: data.photo_url,
                        centerCode: data.center_code,
                        referralCode: data.referral_code,
                        referredByCenter: data.referred_by_center_code || data.referred_by_center,
                        referredByStudent: data.referred_by_student,
                        status: data.status,
                        createdAt: data.created_at,
                        mobileVerified: data.mobile_verified,
                        emailVerified: data.email_verified,
                    };
                    setStudent(studentData);
                    setStoreStudent(studentData);
                } else {
                    setStudent(null);
                    setStoreStudent(null); // Also clear store if no data
                }
            }
        } catch (error) {
            console.error('Error fetching student profile:', error);
            setStudent(null); // Ensure student is null on catch
            setStoreStudent(null); // Ensure store student is null on catch
        } finally {
            setLoading(false);
        }
    };

    const fetchCenterProfile = async (userId: string) => {
        try {
            const { data, error } = await backend
                .from('centers')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching center profile:', error);
                setStoreCenter(null);
            } else if (data) {
                // Map center data
                const centerData = {
                    id: data.id,
                    userId: data.user_id,
                    name: data.name,
                    centerType: data.center_type,
                    ownerName: data.owner_name,
                    ownerPhone: data.phone,
                    ownerEmail: data.email,
                    ownerAadhaar: data.owner_aadhaar,
                    address: data.address,
                    village: data.village,
                    block: data.block,
                    state: data.state,
                    district: data.district,
                    pincode: data.pincode,
                    centerCode: data.center_code,
                    status: data.status,
                    idProofUrl: data.id_proof_url,
                    centerPhotoUrl: data.center_photo_url,
                    totalStudents: data.total_students || 0,
                    totalEarnings: Number(data.total_earnings || 0),
                    createdAt: data.created_at,
                };
                setStoreCenter(centerData as any);
            }
        } catch (error) {
            console.error('Error in fetchCenterProfile:', error);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        const { error } = await backend.auth.signOut();
        if (error) {
            toast({
                title: 'Error signing out',
                description: error.message,
                variant: 'destructive',
            });
        } else {
            setStudent(null);
            setStoreStudent(null);
            setStoreCenter(null);
        }
    };

    return (
        <AuthContext.Provider value={{ session, user, student, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
