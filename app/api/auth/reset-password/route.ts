// POST /api/auth/reset-password — Verify token and set new password
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Support both new custom flow (token + password) and legacy forgot-password trigger (email + redirectTo)
    const { token, password, email, redirectTo } = body;

    // Legacy: email + redirectTo means the forgot-password page is calling to send the email
    // Redirect to new endpoint
    if (email && redirectTo && !token && !password) {
      const { default: handler } = await import('@/app/api/auth/forgot-password/route');
      return handler.POST(request);
    }

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Look up reset token
    const { data: resetRecord, error: tokenError } = await db
      .from('password_reset_tokens')
      .select('user_id, expires_at, used')
      .eq('token', token)
      .maybeSingle();

    if (tokenError || !resetRecord) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    if (resetRecord.used) {
      return NextResponse.json({ error: 'Reset link has already been used' }, { status: 400 });
    }

    if (new Date(resetRecord.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Reset link has expired' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    // Update password in sellers
    const { error: sellerUpdateError } = await db
      .from('sellers')
      .update({
        password_hash: hashedPassword,
        is_temp_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', resetRecord.user_id);

    // Also try admins table in case user is admin
    await db
      .from('admins')
      .update({ password_hash: hashedPassword })
      .eq('user_id', resetRecord.user_id);

    // Mark token as used
    await db
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('token', token);

    if (sellerUpdateError) {
      console.warn('[RESET-PASSWORD] No seller row updated (may be admin-only user)');
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[RESET-PASSWORD] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
