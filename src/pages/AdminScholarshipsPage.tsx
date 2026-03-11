import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useScholarshipStore,
  useStudentStore,
  useExamStore,
  useAuthStore,
  useCertificateStore,
  useEmailStore,
  useAdminLogStore,
} from '@/stores';
import { SCHOLARSHIP_CONFIG } from '@/constants/config';
import { formatCurrency, formatDate, getOrdinal, getStatusColorClass } from '@/lib/utils';

export function AdminScholarshipsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentAdmin, isAdminLoggedIn } = useAuthStore();
  const { students, loadStudents } = useStudentStore();
  const { config, results, loadExamData } = useExamStore();
  const { scholarships, loadScholarships, approveScholarship, rejectScholarship } = useScholarshipStore();
  const { generateCertificate } = useCertificateStore();
  const { templates, loadEmailData, sendEmail } = useEmailStore();
  const { addLog } = useAdminLogStore();

  useEffect(() => {
    if (!isAdminLoggedIn || !currentAdmin) {
      navigate('/admin/login');
      return;
    }
    loadStudents();
    loadExamData();
    loadScholarships();
    loadEmailData();
  }, [isAdminLoggedIn, currentAdmin, navigate, loadStudents, loadExamData, loadScholarships, loadEmailData]);

  const handleApprove = async (scholarshipId: string, studentId: string, rank: number) => {
    if (!currentAdmin) return;

    const amount = (config.scholarshipAmounts && config.scholarshipAmounts[rank]) || SCHOLARSHIP_CONFIG.defaultAmounts[rank] || 0;
    const examResult = results.find((r) => r.studentId === studentId);

    approveScholarship(scholarshipId, currentAdmin.id, 'BOTH', amount);
    addLog(currentAdmin.id, 'APPROVE_SCHOLARSHIP', scholarshipId, `Approved scholarship rank ${rank} for student ${studentId}`);

    if (examResult) {
      const certificate = await generateCertificate(studentId, examResult.id, rank <= 3 ? 'SCHOLARSHIP' : 'MERIT');

      // Auto-send email with default template
      const defaultTemplate = templates.find((t) => t.isDefault);
      if (defaultTemplate && certificate) {
        try {
          sendEmail(studentId, certificate.certificateId, defaultTemplate.id);
          toast({
            title: 'Scholarship Approved',
            description: `Approved ${formatCurrency(amount)} scholarship, generated certificate, and sent email notification.`,
          });
        } catch (error) {
          toast({
            title: 'Scholarship Approved',
            description: `Approved ${formatCurrency(amount)} scholarship and generated certificate. Email sending failed.`,
            variant: 'destructive',
          });
        }
      }
    } else {
      toast({
        title: 'Scholarship Approved',
        description: `Approved ${formatCurrency(amount)} scholarship.`,
      });
    }
  };

  const handleReject = (scholarshipId: string) => {
    if (!currentAdmin) return;
    rejectScholarship(scholarshipId, currentAdmin.id, 'Does not meet criteria');
    addLog(currentAdmin.id, 'REJECT_SCHOLARSHIP', scholarshipId, `Rejected scholarship for student`);

    toast({
      title: 'Scholarship Rejected',
      description: 'The scholarship application has been rejected.',
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Scholarship Management</h1>
        <p className="text-muted-foreground">Review and approve scholarship applications</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="size-12 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Clock className="size-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {scholarships.filter((s) => s.approvalStatus === 'PENDING').length}
              </p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="size-12 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="size-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {scholarships.filter((s) => s.approvalStatus === 'APPROVED').length}
              </p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="size-12 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircle className="size-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {scholarships.filter((s) => s.approvalStatus === 'REJECTED').length}
              </p>
              <p className="text-sm text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scholarship Applications</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Rank</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scholarships.map((scholarship) => {
                const student = students.find((s) => s.id === scholarship.studentId);
                const defaultAmount = (config.scholarshipAmounts && config.scholarshipAmounts[scholarship.rank]) || SCHOLARSHIP_CONFIG.defaultAmounts[scholarship.rank] || 0;

                return (
                  <TableRow key={scholarship.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{student?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{student?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>Class {scholarship.class}</TableCell>
                    <TableCell>
                      <Badge variant={scholarship.rank <= 3 ? 'default' : 'secondary'}>
                        {getOrdinal(scholarship.rank)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {formatCurrency(scholarship.amount || defaultAmount)}
                    </TableCell>
                    <TableCell>
                      <span className={`status-badge ${getStatusColorClass(scholarship.approvalStatus)}`}>
                        {scholarship.approvalStatus}
                      </span>
                    </TableCell>
                    <TableCell>
                      {scholarship.approvalStatus === 'PENDING' && (currentAdmin?.role === 'SUPER_ADMIN' || currentAdmin?.role === 'ADMIN') && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(scholarship.id, scholarship.studentId, scholarship.rank)}
                          >
                            <CheckCircle className="size-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(scholarship.id)}
                          >
                            <XCircle className="size-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                      {scholarship.approvalStatus !== 'PENDING' && (
                        <span className="text-xs text-muted-foreground">
                          {formatDate(scholarship.approvedAt || scholarship.createdAt)}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
