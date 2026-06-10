import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { v4 as uuidv4 } from 'uuid';

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

    // Create admin in application DB (DB-only auth)
    // Check if already an admin by email
    const { data: existingAdmin } = await db
      .from('admins')
      .select('id, user_id, email')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (existingAdmin) {
      return NextResponse.json({
        success: true,
        message: 'User is already an admin',
        userId: existingAdmin.user_id,
        email: existingAdmin.email,
      });
    }

    // Hash password and create admin record with generated UUID
    const passwordHash = await hashPassword(password);
    const userId = uuidv4();

    const { error: insertError } = await db.from('admins').insert({
      user_id: userId,
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Admin created successfully',
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
