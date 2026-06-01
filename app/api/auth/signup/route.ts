import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { sendAdminNewSellerNotification } from '@/lib/resend';

export async function POST(request: NextRequest) {
  try {
    const { email, password, phone } = await request.json();

    if (!email || !password || !phone) {
      return NextResponse.json(
        { error: 'Email, password, and phone are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabase();

    // 1. Try to create auth user (may already exist from previous attempt)
    let userId: string;
    let userExists = false;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for now
    });

    if (authError) {
      // Check if error is "User already exists"
      if (authError.message?.includes('already') || authError.message?.includes('exist')) {
        userExists = true;
        // Get existing user by email
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        if (listError || !users) {
          return NextResponse.json(
            { error: 'Failed to find existing user' },
            { status: 500 }
          );
        }
        const existingUser = users.users.find((u: any) => u.email === email);
        if (!existingUser) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }
        userId = existingUser.id;
      } else {
        return NextResponse.json(
          { error: authError.message },
          { status: 400 }
        );
      }
    } else {
      userId = authData.user!.id;
    }

    // 2. Check if seller record already exists - handle duplicates
    const { data: sellers } = await supabase
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    const existingSeller = sellers && sellers.length > 0 ? sellers[0] : null;

    if (!existingSeller) {
      // Create seller record using admin client (bypasses RLS)
      const { error: sellerError } = await supabase.from('sellers').insert({
        user_id: userId,
        email,
        phone,
        approval_status: 'pending',
        stripe_onboarding_status: 'pending',
      });

      if (sellerError) {
        // Only rollback if we just created the user
        if (!userExists) {
          await supabase.auth.admin.deleteUser(userId);
        }
        return NextResponse.json(
          { error: sellerError.message },
          { status: 500 }
        );
      }
    }

    // Send notification to all admins about new seller
    try {
      const { data: admins } = await supabase.from('admins').select('email');
      if (admins && admins.length > 0) {
        for (const admin of admins) {
          await sendAdminNewSellerNotification(admin.email, email, phone);
        }
      }
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError);
      // Don't fail the signup if email fails
    }

    return NextResponse.json({
      success: true,
      userId: userId,
      message: userExists ? 'Account recovered and seller record created' : 'Account created successfully',
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during signup' },
      { status: 500 }
    );
  }
}
