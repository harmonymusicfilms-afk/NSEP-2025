import { Link, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  Menu,
  X,
  User,
  LogOut,
  Shield,
  FileCheck
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores';
import { APP_CONFIG } from '@/constants/config';
import { LanguageToggle } from '@/components/features/LanguageToggle';
import { useLanguage } from '@/contexts/LanguageContext';

import logoImg from '@/assets/gphdm-logo.png';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isStudentLoggedIn, currentStudent, logoutStudent, isAdminLoggedIn } = useAuthStore();
  const { t } = useLanguage();

  const isAdminRoute = location.pathname.startsWith('/admin');

  const navLinks = [
    { href: '/', label: t('nav.home') },
    { href: '/about', label: t('nav.about') },
    { href: '/gallery', label: t('nav.gallery') },
    { href: '/contact', label: t('nav.contact') },
    { href: '/verify', label: t('nav.verify') },
    { href: '/center-registration', label: 'Register Center' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img src={logoImg} alt="GPHDM Logo" className="h-14 w-auto" />
            <div className="hidden sm:block">
              <h1 className="font-serif text-xl font-bold text-foreground leading-tight tracking-wide">
                {APP_CONFIG.shortName}
              </h1>
              <p className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] leading-tight">
                National Scholarship {APP_CONFIG.year}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-medium transition-all hover:text-primary ${location.pathname === link.href
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <LanguageToggle />
            </div>
            {isStudentLoggedIn && currentStudent ? (
              <div className="hidden sm:flex items-center gap-3">
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="size-4" />
                    <span className="max-w-32 truncate">{currentStudent.name}</span>
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={logoutStudent}>
                  <LogOut className="size-4" />
                </Button>
              </div>
            ) : !isAdminRoute ? (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/center-registration">
                  <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10">
                    Register Center
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    {t('nav.login')}
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="bg-primary text-white hover:bg-primary/90">
                    {t('nav.register')}
                  </Button>
                </Link>
              </div>
            ) : null}



            <Link to="/verify" className="md:hidden">
              <Button variant="ghost" size="icon">
                <FileCheck className="size-5" />
              </Button>
            </Link>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="px-3 pb-3 border-b border-border mb-3">
              <LanguageToggle />
            </div>
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === link.href
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary/20'
                    }`}
                >
                  {link.label}
                </Link>
              ))}

              {isStudentLoggedIn ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary/20"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      logoutStudent();
                      setMobileMenuOpen(false);
                    }}
                    className="px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 text-left"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary/20"
                  >
                    Student Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2 rounded-md text-sm font-medium bg-primary text-white hover:bg-primary/90"
                  >
                    Register Now
                  </Link>
                </>
              )}


            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
