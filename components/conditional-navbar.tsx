'use client';

import { usePathname } from 'next/navigation';
import Navbar from './navbar';

export function ConditionalNavbar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/seller') || pathname?.startsWith('/admin');
  
  return (
    <>
      {!isDashboard && <Navbar />}
      {children}
    </>
  );
}
