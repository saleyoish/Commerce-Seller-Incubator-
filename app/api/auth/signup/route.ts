// POST /api/auth/signup — This route is no longer used for authentication.
// Sellers apply via /api/waitlist-signup and get credentials from admin approval.
// This endpoint is kept for backwards compatibility but redirects to waitlist.
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { sendAdminNewSellerNotification } from '@/lib/resend';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { email, password, phone, name } = await request.json();

    if (!email || !phone) {
      return NextResponse.json(
        { error: 'Email and phone are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if seller already exists
    const { data: existing } = await db
      .from('sellers')
      .select('id, user_id, approval_status')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists', existing: true },
        { status: 409 }
      );
    }

    // Generate a user_id (UUID) for this new seller
    const userId = uuidv4();

    // Hash password if provided, otherwise no password yet (pending approval)
    const passwordHash = password ? await hashPassword(password) : null;

    // Create seller record
    const { data: seller, error: sellerError } = await db
      .from('sellers')
      .insert({
        user_id: userId,
        email: normalizedEmail,
        phone,
        name: name || null,
        approval_status: 'pending',
        stripe_onboarding_status: 'pending',
        password_hash: passwordHash,
        is_temp_password: false,
      })
      .select('id, user_id, email')
      .single();

    if (sellerError) {
      console.error('Signup error:', sellerError);
      return NextResponse.json(
        { error: sellerError.message || 'Failed to create account' },
        { status: 500 }
      );
    }

    // Notify admins
    try {
      const { data: admins } = await db.from('admins').select('email');
      if (admins && admins.length > 0) {
        for (const admin of admins) {
          await sendAdminNewSellerNotification(admin.email, normalizedEmail, phone);
        }
      }
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError);
    }

    return NextResponse.json({
      success: true,
      userId: seller.user_id,
      message: 'Account created successfully. Awaiting admin approval.',
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during signup' },
      { status: 500 }
    );
  }
}
