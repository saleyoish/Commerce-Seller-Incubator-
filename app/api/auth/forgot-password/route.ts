// POST /api/auth/forgot-password — Send password reset email
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateResetToken } from '@/lib/password';
import { sendPasswordResetEmail } from '@/lib/resend';
import { sendPasswordResetEmailGmail } from '@/lib/gmail';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

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
          console.warn('[FORGOT-PASSWORD] Resend failed, falling back to Gmail');
        }
      } catch (resendError) {
        console.warn('[FORGOT-PASSWORD] Resend error, falling back to Gmail:', resendError);
      }
      
      // Fallback to Gmail if Resend failed
      if (!emailSent) {
        if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
          const gmailResult = await sendPasswordResetEmailGmail(userEmail, resetUrl);
          if (gmailResult && gmailResult.success === true) {
            emailSent = true;
          } else {
            console.error('[FORGOT-PASSWORD] Gmail fallback also failed');
          }
        } else {
          console.log('[FORGOT-PASSWORD] Reset URL (Gmail not configured):', resetUrl);
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
        console.log('[FORGOT-PASSWORD] Reset URL (no email service):', resetUrl);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[FORGOT-PASSWORD] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
