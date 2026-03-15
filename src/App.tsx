import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Pages
import { HomePage } from '@/pages/HomePage';
import { RegisterPage } from '@/pages/RegisterPage';
import { PaymentPage } from '@/pages/PaymentPage';
import { LoginPage } from '@/pages/LoginPage';
import { StudentDashboard } from '@/pages/StudentDashboard';
import { StudentResultsPage } from '@/pages/StudentResultsPage';
import { StudentCertificatesPage } from '@/pages/StudentCertificatesPage';
import { ExamPage } from '@/pages/ExamPage';
import { AdminLoginPage } from '@/pages/AdminLoginPage';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { AdminStudentsPage } from '@/pages/AdminStudentsPage';
import { AdminScholarshipsPage } from '@/pages/AdminScholarshipsPage';
import { AdminSettingsPage } from '@/pages/AdminSettingsPage';
import { AdminPaymentsPage } from '@/pages/AdminPaymentsPage';
import { AdminCertificatesPage } from '@/pages/AdminCertificatesPage';
import { AdminEmailsPage } from '@/pages/AdminEmailsPage';
import { VerifyPage } from '@/pages/VerifyPage';
import { AboutPage } from '@/pages/AboutPage';
import { TermsPage } from '@/pages/TermsPage';
import { PrivacyPolicyPage } from '@/pages/PrivacyPolicyPage';
import { ContactPage } from '@/pages/ContactPage';
import { GalleryPage } from '@/pages/GalleryPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { UpdatePasswordPage } from '@/pages/UpdatePasswordPage';
import { CreateMockResultPage } from '@/pages/CreateMockResultPage';
import { AdminGalleryPage } from '@/pages/AdminGalleryPage';


import { AdminReferralsPage } from '@/pages/AdminReferralsPage';
import { CenterRegistrationPage } from '@/pages/CenterRegistrationPage';
import { AdminCentersPage } from '@/pages/AdminCentersPage';
import { AdminQuestionsPage } from '@/pages/AdminQuestionsPage';
import { AdminSyllabusPage } from '@/pages/AdminSyllabusPage';
import { AdminAutomationPage } from '@/pages/AdminAutomationPage';

import { CenterLoginPage } from '@/pages/CenterLoginPage';
import { CenterDashboardPage } from '@/pages/CenterDashboardPage';
import { CenterStudentsPage } from '@/pages/CenterStudentsPage';
import { CenterRewardsPage } from '@/pages/CenterRewardsPage';
import { CenterProfilePage } from '@/pages/CenterProfilePage';

// Layouts
import { PublicLayout, StudentLayout, AdminLayout, AuthLayout, CenterLayout } from '@/components/layout';
import { ScrollToTop } from '@/components/ScrollToTop';

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/update-password" element={<UpdatePasswordPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/verify/:certificateId" element={<VerifyPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/center-registration" element={<CenterRegistrationPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/center/login" element={<CenterLoginPage />} />
          </Route>

          {/* Student Routes */}
          <Route element={<StudentLayout />}>
            <Route path="/dashboard" element={<StudentDashboard />} />
            <Route path="/dashboard/exam" element={<ExamPage />} />
            <Route path="/dashboard/results" element={<StudentResultsPage />} />
            <Route path="/dashboard/certificates" element={<StudentCertificatesPage />} />
            <Route path="/dashboard/create-mock-result" element={<CreateMockResultPage />} />
          </Route>

          {/* Center Routes */}
          <Route element={<CenterLayout />}>
            <Route path="/center/dashboard" element={<CenterDashboardPage />} />
            <Route path="/center/students" element={<CenterStudentsPage />} />
            <Route path="/center/rewards" element={<CenterRewardsPage />} />
            <Route path="/center/profile" element={<CenterProfilePage />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/students" element={<AdminStudentsPage />} />
            <Route path="/admin/scholarships" element={<AdminScholarshipsPage />} />
            <Route path="/admin/payments" element={<AdminPaymentsPage />} />
            <Route path="/admin/referrals" element={<AdminReferralsPage />} />
            <Route path="/admin/centers" element={<AdminCentersPage />} />
            <Route path="/admin/certificates" element={<AdminCertificatesPage />} />
            <Route path="/admin/gallery" element={<AdminGalleryPage />} />
            <Route path="/admin/emails" element={<AdminEmailsPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/admin/questions" element={<AdminQuestionsPage />} />
            <Route path="/admin/syllabus" element={<AdminSyllabusPage />} />
            <Route path="/admin/automation" element={<AdminAutomationPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
