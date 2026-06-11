// POST /api/auth/reset-password — Verify token and set new password
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateResetToken } from '@/lib/password';
import { sendPasswordResetEmail } from '@/lib/resend';
import { sendPasswordResetEmailGmail } from '@/lib/gmail';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Support both new custom flow (token + password) and legacy forgot-password trigger (email + redirectTo)
    const { token, password, email, redirectTo } = body;

    // Legacy: email + redirectTo means the forgot-password page is calling to send the email
    // Inline the forgot-password logic
    if (email && redirectTo && !token && !password) {
      const normalizedEmail = email.toLowerCase().trim();

      // Check sellers table first, then admins
      let userId: string | null = null;
      let userEmail = normalizedEmail;

      const { data: seller } = await db
        .from('sellers')
        .select('user_id, email')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (seller) {
        userId = seller.user_id;
      } else {
        const { data: admin } = await db
          .from('admins')
          .select('user_id, email')
          .eq('email', normalizedEmail)
          .maybeSingle();
        if (admin) userId = admin.user_id;
      }

      // Always return success to prevent email enumeration
      if (!userId) {
        return NextResponse.json({ success: true });
      }

      const resetToken = generateResetToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      // Store reset token in DB
      await db.from('password_reset_tokens').upsert({
        user_id: userId,
        token: resetToken,
        expires_at: expiresAt,
        used: false,
      }, { onConflict: 'user_id' });

      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL}/reset-password?token=${resetToken}`;

      // Send email: try Resend first (if configured). If it fails, fallback to Gmail transporter.
      let emailSent = false;
      if (process.env.RESEND_API_KEY) {
        try {
          const result = await sendPasswordResetEmail(userEmail, resetUrl);
          if (result && result.success === true) {
            emailSent = true;
          } else {
            console.warn('[RESET-PASSWORD] Resend failed, falling back to Gmail');
          }
        } catch (resendError) {
          console.warn('[RESET-PASSWORD] Resend error, falling back to Gmail:', resendError);
        }

        // Fallback to Gmail if Resend failed
        if (!emailSent) {
          if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
            const gmailResult = await sendPasswordResetEmailGmail(userEmail, resetUrl);
            if (gmailResult && gmailResult.success === true) {
              emailSent = true;
            } else {
              console.error('[RESET-PASSWORD] Gmail fallback also failed');
            }
          } else {
            console.log('[RESET-PASSWORD] Reset URL (Gmail not configured):', resetUrl);
          }
        }
      } else {
        // No Resend configured — use Gmail directly if available, otherwise log URL
        if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
          const gmailResult = await sendPasswordResetEmailGmail(userEmail, resetUrl);
          if (gmailResult && gmailResult.success === true) {
            emailSent = true;
          }
        } else {
          console.log('[RESET-PASSWORD] Reset URL (no email service):', resetUrl);
        }
      }

      return NextResponse.json({ success: true });
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
