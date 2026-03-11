import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Filter, Download, CheckCircle, XCircle, Clock, Search, Image as ImageIcon, X, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore, usePaymentStore, useStudentStore, usePaymentRequestStore } from '@/stores';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function AdminPaymentsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentAdmin, isAdminLoggedIn } = useAuthStore();
  const { payments, loadPayments, approvePayment, rejectPayment } = usePaymentStore();
  const { students, loadStudents } = useStudentStore();
  const { paymentRequests, loadPaymentRequests, approvePaymentRequest, rejectPaymentRequest } = usePaymentRequestStore();

  const [activeTab, setActiveTab] = useState<'history' | 'requests'>('requests');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  
  // Image preview modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    if (!isAdminLoggedIn || !currentAdmin) {
      navigate('/admin/login');
      return;
    }
    loadPayments();
    loadStudents();
    loadPaymentRequests();
  }, [isAdminLoggedIn, currentAdmin, navigate, loadPayments, loadStudents, loadPaymentRequests]);

  const filteredPayments = payments
    .filter((p) => filterStatus === 'all' || p.status === filterStatus)
    .filter((p) => {
      if (!searchQuery) return true;
      const student = students.find((s) => s.id === p.studentId);
      return (
        student?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.transactionId?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalPayments = payments.length;
  const successfulPayments = payments.filter((p) => p.status === 'SUCCESS');
  const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);
  const pendingPayments = payments.filter((p) => p.status === 'PENDING').length;
  const failedPayments = payments.filter((p) => p.status === 'FAILED').length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="size-4 text-green-600" />;
      case 'FAILED':
        return <XCircle className="size-4 text-red-600" />;
      case 'PENDING':
        return <Clock className="size-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      SUCCESS: 'default',
      PENDING: 'secondary',
      FAILED: 'destructive',
    };
    return (
      <Badge variant={variants[status] || 'outline'} className="gap-1">
        {getStatusIcon(status)}
        {status}
      </Badge>
    );
  };

  const handleExport = () => {
    const csv = [
      ['Payment ID', 'Student Name', 'Email', 'Class', 'Amount', 'Status', 'Order ID', 'Payment ID', 'Date'].join(','),
      ...filteredPayments.map((payment) => {
        const student = students.find((s) => s.id === payment.studentId);
        return [
          payment.id,
          student?.name || 'Unknown',
          student?.email || '',
          student?.class || '',
          payment.amount,
          payment.status,
          payment.razorpayOrderId,
          payment.razorpayPaymentId || '',
          formatDateTime(payment.paidAt || payment.createdAt),
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleApprove = async (paymentId: string, studentName: string) => {
    if (confirm(`Are you sure you want to manually approve the payment for ${studentName}?`)) {
      try {
        await approvePayment(paymentId);
        toast({
          title: "Payment Approved",
          description: `Payment for ${studentName} has been successfully approved.`
        });
      } catch (error) {
        toast({
          title: "Approval Failed",
          description: "Failed to approve payment. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleRejectClick = (paymentId: string) => {
    setRejectingPaymentId(paymentId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectingPaymentId) return;
    if (!rejectReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for rejecting this payment.",
        variant: "destructive"
      });
      return;
    }

    setIsRejecting(true);
    try {
      const payment = payments.find(p => p.id === rejectingPaymentId);
      const student = students.find(s => s.id === payment?.studentId);
      
      // Use store function
      await rejectPayment(rejectingPaymentId, rejectReason.trim());
      
      toast({
        title: "Payment Rejected",
        description: `Payment for ${student?.name || 'Unknown'} has been rejected. Student can re-upload payment proof.`
      });
      
      setShowRejectModal(false);
      setRejectingPaymentId(null);
      setRejectReason('');
    } catch (error) {
      console.error('Reject error:', error);
      toast({
        title: "Rejection Failed",
        description: "Failed to reject payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRejecting(false);
    }
  };

  const handleApproveRequest = async (requestId: string, studentName: string) => {
    if (confirm(`Are you sure you want to approve the payment request for ${studentName}?`)) {
      setIsApproving(true);
      try {
        await approvePaymentRequest(requestId);
        toast({
          title: "Request Approved",
          description: `Payment request for ${studentName} has been approved. Student is now ACTIVE.`
        });
        loadPaymentRequests();
      } catch (error) {
        toast({
          title: "Approval Failed",
          description: "Failed to approve request. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsApproving(false);
      }
    }
  };

  const handleRejectRequest = (requestId: string) => {
    setRejectingPaymentId(requestId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectRequestConfirm = async () => {
    if (!rejectingPaymentId) return;
    if (!rejectReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for rejecting this request.",
        variant: "destructive"
      });
      return;
    }

    setIsRejecting(true);
    try {
      const request = paymentRequests.find(r => r.id === rejectingPaymentId);
      const student = students.find(s => s.id === request?.studentId);
      
      await rejectPaymentRequest(rejectingPaymentId, rejectReason.trim());
      
      toast({
        title: "Request Rejected",
        description: `Payment request for ${student?.name || 'Unknown'} has been rejected.`
      });
      
      setShowRejectModal(false);
      setRejectingPaymentId(null);
      setRejectReason('');
      loadPaymentRequests();
    } catch (error) {
      console.error('Reject error:', error);
      toast({
        title: "Rejection Failed",
        description: "Failed to reject request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="size-6" />
            Payment History
          </h1>
          <p className="text-muted-foreground">Manage and monitor all payment transactions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { loadPayments(); loadStudents(); }} className="gap-2">
            <Clock className="size-4" />
            Refresh Data
          </Button>
          <Button onClick={handleExport} className="gap-2">
            <Download className="size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Payments</p>
            <p className="text-2xl font-bold">{totalPayments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingPayments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Failed</p>
            <p className="text-2xl font-bold text-red-600">{failedPayments}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name, email, or transaction ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="size-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="size-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No payments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="bg-green-50 text-green-800 font-black">APPROVAL ACTION</TableHead>
                    <TableHead className="bg-red-50 text-red-800 font-black">REJECT ACTION</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Proof</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => {
                    const student = students.find((s) => s.id === payment.studentId);
                    return (
                      <TableRow key={payment.id} className={payment.status === 'PENDING' ? 'bg-yellow-50/30' : ''}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{student?.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{student?.email || 'No email'}</p>
                          </div>
                        </TableCell>
                        <TableCell className="bg-green-50/50">
                          {payment.status === 'PENDING' ? (
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700 text-white h-9 px-4 gap-2 font-black shadow-lg border-2 border-white ring-2 ring-green-600 animate-bounce"
                              onClick={() => handleApprove(payment.id, student?.name || 'Unknown')}
                            >
                              <CheckCircle className="size-4" />
                              APPROVE NOW
                            </Button>
                          ) : (
                            <div className="flex items-center gap-1 text-green-600 font-bold text-xs">
                              <CheckCircle className="size-3" />
                              VERIFIED
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="bg-red-50/50">
                          {payment.status === 'PENDING' ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-9 px-4 gap-2 font-black"
                              onClick={() => handleRejectClick(payment.id)}
                            >
                              <XCircle className="size-4" />
                              REJECT
                            </Button>
                          ) : payment.status === 'FAILED' ? (
                            <div className="flex items-center gap-1 text-red-600 font-bold text-xs">
                              <XCircle className="size-3" />
                              REJECTED
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {payment.transactionId ? (
                            <span className="font-mono text-sm font-bold text-blue-600">{payment.transactionId}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {payment.proofUrl ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => setPreviewImage(payment.proofUrl || null)}
                            >
                              <ImageIcon className="size-3" />
                              View Screenshot
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">No Proof</span>
                          )}
                        </TableCell>
                        <TableCell>Class {student?.class || 'N/A'}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell className="text-sm">
                          {formatDateTime(payment.paidAt || payment.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Payment Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="size-5" />
              Reject Payment
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this payment. The student will be notified to re-upload payment proof.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectReason">Rejection Reason</Label>
              <Textarea
                id="rejectReason"
                placeholder="Enter reason for rejection (e.g., invalid transaction, screenshot unclear, amount mismatch)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectConfirm}
              disabled={isRejecting || !rejectReason.trim()}
            >
              {isRejecting ? (
                <>
                  <Clock className="size-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="size-4 mr-2" />
                  Confirm Rejection
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Payment Screenshot Preview</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            {previewImage && (
              <img 
                src={previewImage} 
                alt="Payment Proof" 
                className="max-h-[70vh] rounded-lg object-contain" 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
