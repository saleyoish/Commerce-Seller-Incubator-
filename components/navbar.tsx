"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Home, LayoutDashboard, Menu, X, User, Play } from "lucide-react";
import { useState, useEffect } from 'react';
import { createClientSideSupabase } from '@/lib/supabase-client';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClientSideSupabase();
    
    // Check initial auth state and admin role
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      
      // Check if user is admin
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
    
    // Listen for auth state changes
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

  // Don't show marketing navbar on admin pages
  if (pathname && pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <nav className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="font-bold text-gray-900">TikTok Shop Fast Track</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" className="gap-2">
                <Home className="w-4 h-4" />
                Home
              </Button>
            </Link>
            <Link href="/#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')}>
              <Button variant="ghost" className="gap-2">
                <Play className="w-4 h-4" />
                How It Works
              </Button>
            </Link>
            {isLoggedIn && (
              <Link href="/dashboard" className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>
            )}
            {isAdmin && !isAdminPage && (
              <Link href="/admin">
                <Button variant="outline" className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
                  <LayoutDashboard className="w-4 h-4" />
                  Switch to Admin
                </Button>
              </Link>
            )}
            {isLoggedIn ? (
              <Button 
                variant="ghost" 
                className="gap-2"
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
                <Button variant="ghost" className="gap-2">
                  <User className="w-4 h-4" />
                  Log In
                </Button>
              </Link>
            )}
            {!isLoggedIn && (
              <Link href="/signup">
                <Button className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0 text-sm font-medium px-5 h-10">
                  Sign up as Seller
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t space-y-2">
            <Link
              href="/"
              className="flex items-center gap-2 py-2 text-gray-700 hover:text-gray-900"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
            <Link
              href="/#how-it-works"
              className="flex items-center gap-2 py-2 text-gray-700 hover:text-gray-900"
              onClick={(e) => { scrollToSection(e, 'how-it-works'); setIsMobileMenuOpen(false); }}
            >
              <Play className="w-4 h-4" />
              How It Works
            </Link>
            {isLoggedIn && (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 py-2 text-gray-700 hover:text-gray-900"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-2 py-2 text-red-600 font-semibold"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <LayoutDashboard className="w-4 h-4" />
                Switch to Admin
              </Link>
            )}
            {isLoggedIn ? (
              <button
                className="flex items-center gap-2 py-2 text-gray-700 hover:text-gray-900 w-full text-left"
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
              <Link
                href="/login"
                className="flex items-center gap-2 py-2 text-gray-700 hover:text-gray-900"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <User className="w-4 h-4" />
                Log In
              </Link>
            )}
            {!isLoggedIn && (
              <Link
                href="/signup"
                className="flex items-center gap-2 py-2 text-red-600 font-semibold"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign up as Seller
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
