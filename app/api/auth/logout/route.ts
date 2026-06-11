// POST /api/auth/logout — Logout endpoint
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ message: 'Logged out successfully' });
}

export async function GET() {
  // Support GET for /logout route redirect
  return NextResponse.redirect(
    new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
  );
}
