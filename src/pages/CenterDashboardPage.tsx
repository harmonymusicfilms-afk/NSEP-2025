import { useState, useEffect } from 'react';
import {
    Users,
    Gift,
    Share2,
    Copy,
    CheckCircle,
    TrendingUp,
    Wallet,
    Search,
    ExternalLink,
    Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { useAuthStore } from '@/stores';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { client as backend } from '@/lib/backend';
import { Link } from 'react-router-dom';

export function CenterDashboardPage() {
    const { currentCenter } = useAuthStore();
    const { toast } = useToast();
    const [referredStudents, setReferredStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const referralLink = `${window.location.origin}/register?ref=${currentCenter?.centerCode}`;

    useEffect(() => {
        if (currentCenter) {
            loadDashboardData();
        }
    }, [currentCenter]);

    const loadDashboardData = async () => {
        setIsLoading(true);
        try {
            // Fetch students referred by this center
            const { data, error } = await backend
                .from('students')
                .select('*')
                .eq('referred_by_center_code', currentCenter?.centerCode)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReferredStudents(data || []);
        } catch (err) {
            console.error('Error loading center dashboard data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const copyReferralLink = () => {
        navigator.clipboard.writeText(referralLink);
        toast({
            title: 'Link Copied!',
            description: 'Your unique referral link has been copied to clipboard.',
        });
    };

    const filteredStudents = referredStudents.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.mobile.includes(searchTerm)
    );

    const stats = [
        {
            label: 'Total Referrals',
            value: referredStudents.length,
            icon: Users,
            color: 'text-blue-600',
            bg: 'bg-blue-100'
        },
        {
            label: 'Active Students',
            value: referredStudents.filter(s => s.status === 'ACTIVE').length,
            icon: TrendingUp,
            color: 'text-green-600',
            bg: 'bg-green-100'
        },
        {
            label: 'Total Earned',
            value: formatCurrency(currentCenter?.totalEarnings || 0),
            icon: Wallet,
            color: 'text-amber-600',
            bg: 'bg-amber-100'
        },
        {
            label: 'Reward Rate',
            value: '₹50/Student',
            icon: Gift,
            color: 'text-purple-600',
            bg: 'bg-purple-100'
        },
    ];

    return (
        <div className="p-6 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-serif text-3xl font-bold text-foreground">
                        Center Dashboard
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-muted-foreground">
                            Welcome back, <span className="font-semibold text-foreground">{currentCenter?.ownerName}</span>
                        </p>
                        <Badge variant="outline" className="bg-muted">{currentCenter?.name}</Badge>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:block">
                        <Badge variant="outline" className="px-3 py-1 bg-amber-50 text-amber-700 border-amber-200">
                            Code: {currentCenter?.centerCode}
                        </Badge>
                    </div>
                    <Button
                        variant="default"
                        className="bg-amber-600 hover:bg-amber-700 shadow-md"
                        onClick={copyReferralLink}
                    >
                        <Share2 className="size-4 mr-2" />
                        Copy Link
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <Card key={stat.label} className="border-none shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className={`size-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                                <stat.icon className={`size-6 ${stat.color}`} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                                <h3 className="text-2xl font-bold text-foreground">{stat.value}</h3>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Referral Card */}
                <Card className="lg:col-span-1 shadow-md border-t-4 border-t-amber-600 bg-white/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Share2 className="size-5 text-amber-600" />
                            Referral Management
                        </CardTitle>
                        <CardDescription>
                            Share your unique link to register students.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Shareable Register Link</label>
                            <div className="flex gap-2">
                                <Input
                                    readOnly
                                    value={referralLink}
                                    className="bg-muted text-[10px] font-mono"
                                />
                                <Button variant="outline" size="icon" className="shrink-0" onClick={copyReferralLink}>
                                    <Copy className="size-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                            <div className="size-8 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                                <TrendingUp className="size-4 text-amber-600" />
                            </div>
                            <p className="text-xs text-amber-800 leading-normal">
                                You earn <span className="font-bold">₹50</span> for every student who registers and completes their donation payment.
                            </p>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <h4 className="text-sm font-semibold">Center Quick Actions</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" className="text-xs h-9 justify-start" asChild>
                                    <Link to="/center/add-student">
                                        <Users className="size-3 mr-2" /> Add Student
                                    </Link>
                                </Button>
                                <Button variant="outline" className="text-xs h-9 justify-start" asChild>
                                    <Link to="/center/students">
                                        <Users className="size-3 mr-2" /> View All
                                    </Link>
                                </Button>
                                <Button variant="outline" className="text-xs h-9 justify-start" asChild>
                                    <Link to="/center/rewards">
                                        <Gift className="size-3 mr-2" /> Rewards
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Students Table */}
                <Card className="lg:col-span-2 shadow-md">
                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                        <div>
                            <CardTitle>Recent Registrations</CardTitle>
                            <CardDescription>
                                Latest students who joined via your center
                            </CardDescription>
                        </div>
                        <div className="relative w-full max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                                placeholder="Search name, mobile..."
                                className="pl-9 h-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                <Loader2 className="size-8 animate-spin mb-4" />
                                <p className="animate-pulse">Fetching records...</p>
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-xl border-2 border-dashed">
                                <Users className="size-16 mx-auto mb-4 opacity-10" />
                                <p className="font-semibold text-lg">No students found</p>
                                <p className="text-sm max-w-xs mx-auto mt-2">
                                    When students use your referral link, they will appear here automatically.
                                </p>
                                <Button variant="outline" className="mt-6" onClick={copyReferralLink}>
                                    Copy Link & Start Sharing
                                </Button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="rounded-tl-lg">Student</TableHead>
                                            <TableHead>Class</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right rounded-tr-lg">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredStudents.map((student) => (
                                            <TableRow key={student.id} className="hover:bg-muted/30 transition-colors">
                                                <TableCell>
                                                    <div>
                                                        <p className="font-semibold text-sm">{student.name}</p>
                                                        <p className="text-[10px] text-muted-foreground font-mono">{student.mobile}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="bg-white">Class {student.class_level || student.class}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={student.status === 'ACTIVE' ? 'default' : 'secondary'}
                                                        className={student.status === 'ACTIVE' ? 'bg-green-600' : ''}
                                                    >
                                                        {student.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                                                    {formatDate(student.created_at)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <ExternalLink className="size-3.5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
