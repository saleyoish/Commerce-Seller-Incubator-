"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Home, LayoutDashboard, Menu, X, User, Play, Sun, Moon } from "lucide-react";
import { useState, useEffect } from 'react';
import { createClientSideSupabase } from '@/lib/supabase-client';
import { useTheme } from '@/components/theme-provider';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme, mounted } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClientSideSupabase();
    
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        setIsAdmin(data?.role === 'admin');
      }
    };
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });
    
    return () => subscription.unsubscribe();
  }, []);
  
  const isAdminPage = pathname?.startsWith('/admin');

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (pathname && pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <nav className="bg-[var(--bg-nav)] border-b border-[var(--border-default)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="font-bold gradient-text text-lg">Live Commerce</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-1">
              <Link href="/">
                <Button variant="ghost" className="gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)]">
                  <Home className="w-4 h-4" />
                  Home
                </Button>
              </Link>
              <Link href="/#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')}>
                <Button variant="ghost" className="gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)]">
                  <Play className="w-4 h-4" />
                  How It Works
                </Button>
              </Link>
              {isLoggedIn && (
                <Link href="/seller">
                  <Button variant="ghost" className="gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)]">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Button>
                </Link>
              )}
              {isAdmin && !isAdminPage && (
                <Link href="/admin">
                  <Button variant="outline" className="gap-2 border-[var(--accent-primary)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white">
                    <LayoutDashboard className="w-4 h-4" />
                    Admin
                  </Button>
                </Link>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              {/* Theme Toggle */}
              <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] hover:border-[var(--border-bright)] transition-all ml-2"
              aria-label="Toggle theme"
              suppressHydrationWarning
            >
              {mounted ? (
                theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" /> // Default to sun for SSR (dark mode -> light icon)
              )}
            </button>
            
            {isLoggedIn ? (
              <Button 
                variant="ghost" 
                className="gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] ml-2"
                onClick={async () => {
                  const supabase = createClientSideSupabase();
                  await supabase.auth.signOut();
                  setIsLoggedIn(false);
                  router.push('/');
                }}
              >
                <User className="w-4 h-4" />
                Log Out
              </Button>
            ) : (
              <Link href="/login">
                <Button variant="ghost" className="gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] ml-2">
                  <User className="w-4 h-4" />
                  Log In
                </Button>
              </Link>
            )}
            {!isLoggedIn && (
              <Link href="/signup" className="ml-2">
                <button className="btn-primary text-sm">
                  Join Waitlist
                </button>
              </Link>
            )}
          </div>
        </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)]"
              aria-label="Toggle theme"
              suppressHydrationWarning
            >
              {mounted ? (
                theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </button>
            <button
              className="p-2 text-[var(--text-secondary)]"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--border-default)] space-y-1">
            <Link
              href="/"
              className="flex items-center gap-2 py-2 px-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)]"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
            <Link
              href="/#how-it-works"
              className="flex items-center gap-2 py-2 px-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)]"
              onClick={(e) => { scrollToSection(e, 'how-it-works'); setIsMobileMenuOpen(false); }}
            >
              <Play className="w-4 h-4" />
              How It Works
            </Link>
            {isLoggedIn && (
              <>
                <Link
                  href="/seller"
                  className="flex items-center gap-2 py-2 px-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)]"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
              </>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-2 py-2 px-2 rounded-lg text-[var(--accent-primary)] font-semibold hover:bg-[var(--bg-raised)]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <LayoutDashboard className="w-4 h-4" />
                Switch to Admin
              </Link>
            )}
            {isLoggedIn ? (
              <button
                className="flex items-center gap-2 py-2 px-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] w-full text-left"
                onClick={async () => {
                  const supabase = createClientSideSupabase();
                  await supabase.auth.signOut();
                  setIsLoggedIn(false);
                  setIsMobileMenuOpen(false);
                  router.push('/');
                }}
              >
                <User className="w-4 h-4" />
                Log Out
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex items-center gap-2 py-2 px-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)]"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <User className="w-4 h-4" />
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center gap-2 py-2 px-2 rounded-lg text-[var(--accent-primary)] font-semibold hover:bg-[var(--bg-raised)]"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Join Waitlist
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
