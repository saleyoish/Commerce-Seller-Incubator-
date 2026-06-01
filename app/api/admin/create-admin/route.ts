import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    // Security check - require secret key
    const secretKey = request.headers.get('x-admin-secret');
    const expectedSecret = process.env.ADMIN_CREATE_SECRET || 'your-secret-key-change-this';

    if (secretKey !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid secret key' },
        { status: 401 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabase();

    // 1. Check if user already exists in auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let userId: string | null = null;
    let userExists = false;

    const existingUser = existingUsers?.users.find((u: any) => u.email === email);

    if (existingUser) {
      userId = existingUser.id;
      userExists = true;
    } else {
      // 2. Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError) {
        return NextResponse.json(
          { error: authError.message },
          { status: 400 }
        );
      }

      userId = authData.user!.id;
    }

    // 3. Check if already an admin
    const { data: existingAdmin } = await supabase
      .from('admins')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingAdmin) {
      return NextResponse.json({
        success: true,
        message: 'User is already an admin',
        userId,
        email,
      });
    }

    // 4. Insert into admins table
    const { error: adminError } = await supabase.from('admins').insert({
      user_id: userId,
      email,
    });

    if (adminError) {
      return NextResponse.json(
        { error: adminError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: userExists ? 'Existing user promoted to admin' : 'Admin created successfully',
      userId,
      email,
    });

  } catch (error: any) {
    console.error('Create admin error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create admin' },
      { status: 500 }
    );
  }
}
