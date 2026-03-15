import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CreditCard,
  Award,
  FileCheck,
  TrendingUp,
  DollarSign,
  Clock,
  AlertCircle,
  BarChart3,
  PieChart,
  Share2,
  Building2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartPieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { APP_CONFIG, CLASSES } from '@/constants/config';
import { formatCurrency } from '@/lib/utils';
import { client as backend } from '@/lib/backend';
import {
  useAuthStore,
  useStudentStore,
  usePaymentStore,
  useExamStore,
  useScholarshipStore,
  useCertificateStore,
  useCenterRewardStore,
  useAdminStore,
  useReferralStore,
} from '@/stores';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#a855f7'];

export function AdminDashboard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentAdmin, isAdminLoggedIn } = useAuthStore();

  // Center stats state
  const [centerStats, setCenterStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
  });

  // Stores
  const { students, loadStudents } = useStudentStore();
  const { payments, loadPayments } = usePaymentStore();
  const { results, loadExamData } = useExamStore();
  const { loadScholarships } = useScholarshipStore();
  const { loadCertificates } = useCertificateStore();
  const { rewards, loadRewards } = useCenterRewardStore();
  const { centers, loadReferralData } = useReferralStore();
  const { stats: adminStats, classStats, fetchDashboardStats, fetchClassWiseStats, isLoading: statsLoading } = useAdminStore();

  useEffect(() => {
    if (!isAdminLoggedIn || !currentAdmin) {
      navigate('/admin/login');
      return;
    }
    loadStudents();
    loadPayments();
    loadExamData();
    loadScholarships();
    loadCertificates();
    loadRewards();
    loadReferralData();
    fetchDashboardStats();
    fetchClassWiseStats();

    // Fetch center stats
    const fetchCenterStats = async () => {
      try {
        const { data: centersData } = await backend.from('centers').select('status, payment_status');
        if (centersData) {
          const total = centersData.length;
          const active = centersData.filter(c => c.status === 'APPROVED' && c.payment_status === 'paid').length;
          const pending = centersData.filter(c => c.status === 'PENDING' || c.payment_status !== 'paid').length;
          setCenterStats({ total, active, pending });
        }
      } catch (error) {
        console.error('Error fetching center stats:', error);
      }
    };
    fetchCenterStats();
  }, [isAdminLoggedIn, currentAdmin, navigate, loadStudents, loadPayments, loadExamData, loadScholarships, loadCertificates, loadRewards, loadReferralData, fetchDashboardStats, fetchClassWiseStats]);

  // Dashboard Stats from Backend RPC
  const totalStudents = Number(adminStats?.totalStudents || 0);
  const activeStudentsCount = Number(adminStats?.activeStudents || 0);
  const totalRevenueAmount = Number(adminStats?.totalRevenue || 0);
  const successfulPaymentsCount = Number(adminStats?.successfulPayments || 0);
  const examsCompletedCount = Number(adminStats?.examsCompleted || 0);
  const certificatesIssuedCount = Number(adminStats?.certificatesIssued || 0);
  const pendingScholarshipsCount = Number(adminStats?.pendingScholarships || 0);
  const totalCenterRewardsAmount = Number(adminStats?.totalCenterRewards || 0);

  // Class-wise distribution from Backend RPC
  const chartClassWiseData = useMemo(() => {
    if (!Array.isArray(classStats)) return [];
    return classStats.map(cs => ({
      name: `Class ${cs.class}`,
      students: cs.studentCount || 0,
      exams: cs.examsTaken || 0,
    }));
  }, [classStats]);

  const successfulPayments = useMemo(() =>
    (payments || []).filter((p) => p.status === 'SUCCESS'),
    [payments]
  );

  // Revenue trends (last 7 days)
  const revenueTrends = useMemo(() => {
    const days = 7;
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayPayments = successfulPayments.filter(p => {
        const paidAtDate = p.paidAt?.split('T')[0];
        const createdAtDate = p.createdAt?.split('T')[0];
        return paidAtDate === dateStr || createdAtDate === dateStr;
      });
      const dayRevenue = dayPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      data.push({
        date: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        revenue: dayRevenue,
      });
    }
    return data;
  }, [successfulPayments]);

  // Registration & Referral Trends (Last 14 Days)
  const trendsData = useMemo(() => {
    const days = 14;
    const data = [];
    const safeStudents = students || [];
    const safeRewards = rewards || [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Filter for this day
      const dayStart = new Date(dateStr).getTime();
      const dayEnd = dayStart + 86400000;

      const regCount = safeStudents.filter(s => {
        if (!s.createdAt) return false;
        const d = new Date(s.createdAt).getTime();
        return d >= dayStart && d < dayEnd;
      }).length;

      const refCount = safeRewards.filter(r => {
        const createdStr = r.createdAt || new Date().toISOString();
        const d = new Date(createdStr).getTime();
        return d >= dayStart && d < dayEnd;
      }).length;

      data.push({
        date: date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        registrations: regCount,
        referrals: refCount,
      });
    }
    return data;
  }, [students, rewards]);

  // Referral stats
  const referralStatsData = useMemo(() => {
    // Since center_rewards are all from centers in our current schema, 
    // we map them accordingly.
    const centerReferrals = rewards.length;
    return [
      { name: 'Center Referrals', value: centerReferrals, color: '#10b981' },
      { name: 'Direct', value: Math.max(0, totalStudents - centerReferrals), color: '#f59e0b' },
    ].filter(d => d.value > 0);
  }, [rewards, totalStudents]);

  // Exam performance distribution
  const performanceData = useMemo(() => {
    const ranges = [
      { name: '0-40%', min: 0, max: 40 },
      { name: '40-60%', min: 40, max: 60 },
      { name: '60-80%', min: 60, max: 80 },
      { name: '80-100%', min: 80, max: 100 },
    ];
    const maxScore = 240; // 60 questions * 4 marks
    const safeResults = results || [];
    return ranges.map(range => ({
      name: range.name,
      count: safeResults.filter(r => {
        const score = Number(r.totalScore) || 0;
        const percent = (score / maxScore) * 100;
        return percent >= range.min && percent < range.max;
      }).length,
    }));
  }, [results]);

  const stats = [
    {
      title: 'Total Students',
      value: totalStudents,
      subtitle: `${activeStudentsCount} active`,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      title: 'Total Centers',
      value: centerStats.total,
      subtitle: `${centerStats.active} active`,
      icon: Building2,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100',
    },
    {
      title: 'Active Centers',
      value: centerStats.active,
      subtitle: 'paid & active',
      icon: Building2,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      title: 'Pending Centers',
      value: centerStats.pending,
      subtitle: 'awaiting payment',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-100',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(totalRevenueAmount),
      subtitle: `${successfulPaymentsCount} payments`,
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      title: 'Exams Completed',
      value: examsCompletedCount,
      subtitle: `${(results || []).filter(r => r.resultStatus === 'PUBLISHED').length} published`,
      icon: FileCheck,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      title: 'Pending Approvals',
      value: pendingScholarshipsCount,
      subtitle: 'scholarships',
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
    },
    {
      title: 'Referral Rewards',
      value: formatCurrency(totalCenterRewardsAmount),
      subtitle: `${(rewards || []).length} referrals`,
      icon: Share2,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
    {
      title: 'Certificates Issued',
      value: certificatesIssuedCount,
      subtitle: 'total',
      icon: Award,
      color: 'text-teal-600',
      bg: 'bg-teal-100',
    },
  ];

  const recentPayments = useMemo(() =>
    (payments || [])
      .filter((p) => p.status === 'SUCCESS')
      .sort((a, b) => {
        const timeB = new Date(b.paidAt || b.createdAt || 0).getTime();
        const timeA = new Date(a.paidAt || a.createdAt || 0).getTime();
        return timeB - timeA;
      })
      .slice(0, 5),
    [payments]
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of scholarship examination system</p>
      </div>

      {/* Referral Quick Info */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Share2 className="size-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-blue-900">Master Referral Code</p>
              <p className="text-sm text-blue-700">Give this code to students who don't have a center referral.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="px-3 py-1.5 bg-white border border-blue-200 rounded font-mono font-bold text-lg text-blue-600">
              {APP_CONFIG.masterReferralCode}
            </code>
            <Button
              size="sm"
              variant="outline"
              className="bg-white"
              onClick={() => {
                navigator.clipboard.writeText(APP_CONFIG.masterReferralCode);
                toast({ title: "Copied!", description: "Master referral code copied to clipboard." });
              }}
            >
              Copy
            </Button>
            <Button size="sm" onClick={() => navigate('/admin/referrals')}>
              Manage Referrals
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className={`size-12 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`size-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">


        {/* Revenue Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="size-5 text-green-600" />
              Revenue Trends (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrends}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" fontSize={12} tickLine={false} />
                  <YAxis fontSize={12} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Registration & Referral Trends - New Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-5 text-blue-600" />
              Registration Trends (14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" fontSize={12} tickLine={false} />
                  <YAxis fontSize={12} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="registrations" name="New Students" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="size-5 text-green-600" />
              Referral Activity (14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" fontSize={12} tickLine={false} />
                  <YAxis fontSize={12} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Bar dataKey="referrals" name="New Referrals" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Class-wise Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-5 text-purple-600" />
              Class-wise Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartClassWiseData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" fontSize={12} tickLine={false} />
                  <YAxis dataKey="name" type="category" fontSize={11} tickLine={false} width={60} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="students" fill="#3b82f6" name="Students" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="exams" fill="#10b981" name="Exams" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Referral Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="size-5 text-orange-600" />
              Referral Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {referralStatsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartPieChart>
                    <Pie
                      data={referralStatsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {referralStatsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                  </RechartPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No referral data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exam Performance & Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Exam Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="size-5 text-indigo-600" />
              Exam Performance Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} />
                  <YAxis fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: number) => [value, 'Students']}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                    {performanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-5" />
              Recent Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="text-muted-foreground text-sm">No payments yet</p>
            ) : (
              <div className="space-y-3">
                {(recentPayments || []).map((payment) => {
                  const student = (students || []).find((s) => s.id === payment.studentId);
                  return (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{student?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">Class {student?.class}</p>
                      </div>
                      <p className="font-semibold text-green-600">{formatCurrency(payment.amount)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="size-5" />
            Pending Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingScholarshipsCount > 0 && (
              <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <Award className="size-8 text-yellow-600" />
                <div>
                  <p className="font-medium text-sm">Scholarship Approvals</p>
                  <p className="text-2xl font-bold text-yellow-700">{pendingScholarshipsCount}</p>
                </div>
              </div>
            )}
            {results.filter((r) => r.resultStatus === 'PENDING').length > 0 && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <TrendingUp className="size-8 text-blue-600" />
                <div>
                  <p className="font-medium text-sm">Results to Publish</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {(results || []).filter((r) => r.resultStatus === 'PENDING').length}
                  </p>
                </div>
              </div>
            )}
            {(() => {
              const pendingCenters = centers.filter((c: any) => c.status === 'PENDING').length;
              return pendingCenters > 0 ? (
                <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <Share2 className="size-8 text-orange-600" />
                  <div>
                    <p className="font-medium text-sm">Center Approvals</p>
                    <p className="text-2xl font-bold text-orange-700">{pendingCenters}</p>
                  </div>
                </div>
              ) : null;
            })()}
            {pendingScholarshipsCount === 0 && (results || []).filter((r) => r.resultStatus === 'PENDING').length === 0 && (
              <p className="text-muted-foreground text-sm col-span-full text-center py-4">No pending actions</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
