// GET/PUT /api/users/profile — Get or update user profile
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, extractToken } from '@/lib/jwt';
import { db } from '@/lib/db';
import { hashPassword, comparePassword } from '@/lib/password';

export async function GET(request: NextRequest) {
  try {
    const token = extractToken(request.headers);
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { data: seller } = await db
      .from('sellers')
      .select('id, user_id, email, phone, approval_status, is_temp_password, created_at, updated_at')
      .eq('user_id', payload.userId)
      .maybeSingle();

    return NextResponse.json({
      id: payload.userId,
      email: payload.email,
      seller: seller ?? null,
    });
  } catch (err) {
    console.error('[PROFILE GET] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = extractToken(request.headers);
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { current_password, new_password, phone, name } = await request.json();

    // If changing password, verify current password first
    if (new_password) {
      if (!current_password) {
        return NextResponse.json(
          { error: 'Current password is required to set a new password' },
          { status: 400 }
        );
      }

      const { data: seller } = await db
        .from('sellers')
        .select('password_hash')
        .eq('user_id', payload.userId)
        .maybeSingle();

      if (!seller?.password_hash) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const isValid = await comparePassword(current_password, seller.password_hash);
      if (!isValid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      const newHash = await hashPassword(new_password);
      await db
        .from('sellers')
        .update({
          password_hash: newHash,
          is_temp_password: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', payload.userId);
    }

    // Update other profile fields
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (phone) updates.phone = phone;
    if (name) updates.name = name;

    if (Object.keys(updates).length > 1) {
      await db.from('sellers').update(updates).eq('user_id', payload.userId);
    }

    return NextResponse.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) {
    console.error('[PROFILE PUT] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
