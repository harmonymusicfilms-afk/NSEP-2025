import { useState, useEffect } from 'react';
import { Outlet, Navigate, Link, useSearchParams } from 'react-router-dom';
import { Clock, XCircle, Menu, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Header } from './Header';
import { Footer } from './Footer';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useAuthStore } from '@/stores';

// Simple Light Background Wrapper for all pages
function LightWrapper({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`min-h-screen bg-background relative ${className}`}>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

// Public layout with header and footer
export function PublicLayout() {
  return (
    <LightWrapper className="flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </LightWrapper>
  );
}

// Student dashboard layout with sidebar
export function StudentLayout() {
  const { isStudentLoggedIn, currentStudent, isLoading: authLoading } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const studentIdParam = searchParams.get('student_id');

  console.log('[Layout] isStudentLoggedIn:', isStudentLoggedIn, 'currentStudent:', currentStudent ? 'exists' : 'null', 'authLoading:', authLoading, 'studentIdParam:', studentIdParam);

  // Show loading spinner while checking auth status
  if (authLoading) {
    return (
      <LightWrapper className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </LightWrapper>
    );
  }

  // Allow access if either logged in OR has valid student_id in URL
  // This handles post-registration redirect where auth context hasn't loaded yet
  if (!isStudentLoggedIn && !currentStudent && !studentIdParam) {
    console.log('[Layout] Redirecting to login - not logged in');
    return <Navigate to="/login" replace />;
  }

  console.log('[Layout] Allowing access to dashboard');

  return (
    <LightWrapper className="flex pb-16 md:pb-0 overflow-hidden">
      <Sidebar variant="student" isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Edge Swipe Trigger for Mobile */}
      <div
        className="fixed inset-y-0 left-0 w-6 z-[90] md:hidden"
        onMouseEnter={() => setIsSidebarOpen(true)} // For testing on desktop
        onTouchStart={(e) => {
          const startX = e.touches[0].clientX;
          const handleTouchMove = (moveEvent: TouchEvent) => {
            const currentX = moveEvent.touches[0].clientX;
            if (currentX - startX > 50) {
              setIsSidebarOpen(true);
              document.removeEventListener('touchmove', handleTouchMove);
            }
          };
          document.addEventListener('touchmove', handleTouchMove);
          document.addEventListener('touchend', () => document.removeEventListener('touchmove', handleTouchMove), { once: true });
        }}
      />

      <main className="flex-1 relative flex flex-col overflow-x-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-background border-b border-border sticky top-0 z-40">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="size-6 text-muted-foreground" />
          </Button>
          <span className="font-serif font-bold text-primary">GPHDM Portal</span>
          <div className="size-10 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 text-primary font-bold">
            {useAuthStore.getState().currentStudent?.name.charAt(0) || 'S'}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      <MobileNav onMenuClick={() => setIsSidebarOpen(true)} />
    </LightWrapper>
  );
}

// Admin dashboard layout with sidebar
export function AdminLayout() {
  const { isAdminLoggedIn } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!isAdminLoggedIn) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <LightWrapper className="flex">
      <Sidebar variant="admin" isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 overflow-x-hidden relative flex flex-col">

        {/* Mobile Admin Toggle */}
        <div className="md:hidden p-4 bg-red-600 text-white flex items-center gap-4">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="size-6" />
          </Button>
          <span className="font-bold tracking-widest text-xs">ADMIN CENTRAL</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </LightWrapper>
  );
}

// Center dashboard layout with sidebar
export function CenterLayout() {
  const { isCenterLoggedIn, currentCenter } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!isCenterLoggedIn) {
    return <Navigate to="/center/login" replace />;
  }

  if (currentCenter?.status === 'PENDING') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="size-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <Clock className="size-10 text-amber-600 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold font-serif">Registration Pending</h1>
          <p className="text-muted-foreground">
            Your center application is currently being reviewed by our administrators.
            Once approved, you will have full access to your referral dashboard.
          </p>
          <Button variant="outline" asChild>
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (currentCenter?.status === 'BLOCKED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="size-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="size-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold font-serif">Account Blocked</h1>
          <p className="text-muted-foreground">
            Your center account has been suspended or rejected.
            Please contact administration for more details.
          </p>
          <Button variant="outline" asChild>
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <LightWrapper className="flex">
      <Sidebar variant="center" isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 overflow-x-hidden relative flex flex-col">
        {/* Mobile Center Toggle */}
        <div className="md:hidden p-4 bg-amber-600 text-white flex items-center gap-4">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setIsSidebarOpen(true)}>
            <Menu className="size-6" />
          </Button>
          <span className="font-bold tracking-widest text-xs">CENTER CENTRAL</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </LightWrapper>
  );
}

// Simple centered layout for auth pages
export function AuthLayout() {
  return (
    <LightWrapper className="flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <Outlet />
      </main>
    </LightWrapper>
  );
}
