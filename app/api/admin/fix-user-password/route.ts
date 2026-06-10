// POST /api/admin/fix-user-password — Emergency fix for user password
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    console.log('[FIX-PASSWORD] Fixing password for:', email);

    // Check current user state
    const { data: user, error: checkError } = await db
      .from('sellers')
      .select('id, user_id, email, password_hash, approval_status')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (checkError) {
      console.error('[FIX-PASSWORD] Error checking user:', checkError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log('[FIX-PASSWORD] Current user state:', user);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Hash the new password
    const passwordHash = await hashPassword(password);
    console.log('[FIX-PASSWORD] New password hash generated');

    // Update password
    const { data: updateData, error: updateError } = await db
      .from('sellers')
      .update({ 
        password_hash: passwordHash,
        is_temp_password: false,
        updated_at: new Date().toISOString()
      })
      .eq('email', email.toLowerCase().trim())
      .select();

    if (updateError) {
      console.error('[FIX-PASSWORD] Error updating password:', updateError);
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    console.log('[FIX-PASSWORD] Password updated successfully');

    return NextResponse.json({ 
      success: true,
      message: 'Password updated successfully',
      email: email
    });
  } catch (err: any) {
    console.error('[FIX-PASSWORD] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
