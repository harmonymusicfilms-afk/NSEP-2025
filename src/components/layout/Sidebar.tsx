import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  motion,
  AnimatePresence,
  useDragControls,
  PanInfo
} from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  Award,
  FileCheck,
  Wallet,
  LogOut,
  GraduationCap,
  ClipboardList,
  Gift,
  FileText,
  Share2,
  Mail,
  Image,
  BookOpen,
  Cpu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores';
import { APP_CONFIG } from '@/constants/config';
import { cn } from '@/lib/utils';
import logoImg from '@/assets/gphdm-logo.png';

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/scholarships', label: 'Scholarships', icon: Award },
  { href: '/admin/referrals', label: 'CenterCode', icon: Share2 },
  { href: '/admin/centers', label: 'Centers', icon: GraduationCap },
  { href: '/admin/questions', label: 'Questions', icon: ClipboardList },
  { href: '/admin/certificates', label: 'Certificates', icon: FileText },
  { href: '/admin/syllabus', label: 'Syllabus', icon: BookOpen },
  { href: '/admin/automation', label: 'Automation', icon: Cpu },
  { href: '/admin/gallery', label: 'Gallery', icon: Image },
  { href: '/admin/emails', label: 'Emails', icon: Mail },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

const centerNavItems = [
  { href: '/center/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/center/students', label: 'My Students', icon: Users },
  { href: '/center/rewards', label: 'Rewards', icon: Gift },
  { href: '/center/profile', label: 'Profile', icon: Settings },
];

const studentNavItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/exam', label: 'Take Exam', icon: ClipboardList },
  { href: '/dashboard/results', label: 'Results', icon: Award },
  { href: '/dashboard/certificates', label: 'Certificates', icon: FileCheck },
];

interface SidebarProps {
  variant: 'admin' | 'student' | 'center';
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ variant, isOpen = false, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentAdmin, currentStudent, currentCenter, logoutAdmin, logoutStudent, logoutCenter } = useAuthStore();

  const navItems = variant === 'admin' ? adminNavItems : variant === 'center' ? centerNavItems : studentNavItems;
  const user = variant === 'admin' ? currentAdmin : variant === 'center' ? currentCenter : currentStudent;

  const handleLogout = () => {
    if (variant === 'admin') {
      logoutAdmin();
      navigate('/admin/login');
    } else if (variant === 'center') {
      logoutCenter();
      navigate('/center/login');
    } else {
      logoutStudent();
      navigate('/login');
    }
    onClose?.();
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (info.offset.x < -50 && onClose) {
      onClose();
    }
  };

  const renderSidebarContent = (idSuffix: string) => (
    <aside className="w-[280px] bg-background border-r border-border flex flex-col h-full overflow-hidden shadow-lg relative">
      {/* Header */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        <Link to="/" className="flex items-center gap-4 group">
          <img src={logoImg} alt="GPHDM Logo" className="h-12 w-auto" />
          <div>
            <h1 className="text-lg font-bold text-foreground leading-none">
              {APP_CONFIG.shortName}
            </h1>
            <p className="text-[9px] text-primary font-bold uppercase tracking-[0.2em] mt-1.5">
              {variant === 'admin' ? 'Admin Node' : variant === 'center' ? 'Center Hub' : 'Scholar Portal'}
            </p>
          </div>
        </Link>
        {onClose && (
          <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground hover:text-foreground" onClick={onClose}>
            <X className="size-6" />
          </Button>
        )}
      </div>

      {/* User Info */}
      {user && (
        <div className="p-6 border-b border-border bg-secondary/20">
          <div className="flex items-center gap-4">
            <div className="size-11 bg-primary/10 rounded-xl flex items-center justify-center">
              <Users className="size-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{user.name}</p>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                {(user as any).email || (user as any).ownerEmail || 'Scholar'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.href
            : location.pathname.startsWith(item.href);

          return (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => onClose?.()}
              className={cn(
                "group flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? variant === 'admin'
                    ? 'bg-red-50 text-red-600 border-l-4 border-red-500'
                    : variant === 'center'
                      ? 'bg-amber-50 text-amber-600 border-l-4 border-amber-500'
                      : 'bg-primary/10 text-primary border-l-4 border-primary'
                  : 'text-muted-foreground hover:bg-secondary/20 hover:text-foreground'
              )}
            >
              <item.icon className="size-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-4 h-12 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all font-medium"
          onClick={handleLogout}
        >
          <LogOut className="size-5" />
          <span>Logout</span>
        </Button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block sticky top-0 h-screen">
        {renderSidebarContent('desktop')}
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 z-[100] md:hidden"
          />
        )}
        {isOpen && (
          <motion.div
            key="drawer-content"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag="x"
            dragConstraints={{ right: 0, left: -260 }}
            onDragEnd={handleDragEnd}
            className="fixed inset-y-0 left-0 w-[260px] z-[101] md:hidden shadow-2xl"
          >
            {renderSidebarContent('mobile')}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
