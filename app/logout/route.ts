// GET /logout — redirect to login (client should clear localStorage token)
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.redirect(
    new URL('/login', process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')
  );
}
