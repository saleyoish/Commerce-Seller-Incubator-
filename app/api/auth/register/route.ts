import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/password';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, phone } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check existing seller
    const { data: existing } = await db
      .from('sellers')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Account already exists' }, { status: 409 });
    }

    const userId = uuidv4();
    const passwordHash = await hashPassword(password);

    const { data: seller, error } = await db
      .from('sellers')
      .insert({
        user_id: userId,
        email: normalizedEmail,
        name: name || null,
        phone: phone || null,
        password_hash: passwordHash,
        is_temp_password: false,
        approval_status: 'approved',
      })
      .select()
      .single();

    if (error) {
      console.error('Register error:', error);
      return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: { id: seller.user_id, email: seller.email } }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Register error:', err.message);
    } else {
      console.error('Register error:', err);
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
