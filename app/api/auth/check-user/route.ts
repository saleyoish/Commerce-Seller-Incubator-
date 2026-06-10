// GET /api/auth/check-user — Check if current user is seller or admin
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, extractToken } from '@/lib/jwt';
import { db } from '@/lib/db';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const token = extractToken(request.headers, request.cookies);
    if (!token) {
      return NextResponse.json(
        { error: 'No authenticated user', isSeller: false, isAdmin: false, user: null },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token', isSeller: false, isAdmin: false, user: null },
        { status: 401 }
      );
    }

    const [{ data: sellerData, error: sellerError }, { data: adminData, error: adminError }] =
      await Promise.all([
        db.from('sellers').select('*').eq('id', payload.userId).maybeSingle(),
        db.from('admins').select('id').eq('id', payload.userId).maybeSingle(),
      ]);

    if (sellerError) console.error('Seller query error:', sellerError);
    if (adminError) console.error('Admin query error:', adminError);

    return NextResponse.json({
      isSeller: !!sellerData,
      isAdmin: !!adminData,
      seller: sellerData,
      user: { id: payload.userId, email: payload.email },
    });
  } catch (error) {
    console.error('Error checking user status:', error);
    return NextResponse.json(
      { error: 'Internal server error', isSeller: false, isAdmin: false, user: null },
      { status: 500 }
    );
  }
}
