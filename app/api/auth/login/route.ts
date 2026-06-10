// POST /api/auth/login — Custom JWT login endpoint

import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';

import { comparePassword } from '@/lib/password';

import { signJWT } from '@/lib/jwt';



export async function POST(request: NextRequest) {

  try {

    const { email, password } = await request.json();



    if (!email || !password) {

      return NextResponse.json(

        { error: 'Email and password are required' },

        { status: 400 }

      );

    }



    console.log('[LOGIN] Attempting login for email:', email.toLowerCase().trim());



    // Look up the user by email in the sellers table (which stores credentials)

    const { data: user, error: dbError } = await db

      .from('sellers')

      .select('id, user_id, email, password_hash, approval_status, is_temp_password')

      .eq('email', email.toLowerCase().trim())

      .maybeSingle();



    console.log('[LOGIN] User found in sellers:', user ? 'YES' : 'NO');

    console.log('[LOGIN] DB error:', dbError);

    console.log('[LOGIN] User data:', user);

    console.log('[LOGIN] Password hash exists:', user?.password_hash ? 'YES' : 'NO');

    console.log('[LOGIN] User email from DB:', user?.email);

    console.log('[LOGIN] Input email:', email.toLowerCase().trim());



    if (dbError) {

      console.error('[LOGIN] DB error:', dbError);

      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });

    }



    if (!user || !user.password_hash) {

      console.log('[LOGIN] User not found in sellers or password_hash is null, checking admins...');

      // Also check admins table

      const { data: adminUser, error: adminError } = await db

        .from('admins')

        .select('id, user_id, email, password_hash')

        .eq('email', email.toLowerCase().trim())

        .maybeSingle();



      console.log('[LOGIN] Admin user found:', adminUser ? 'YES' : 'NO');

      console.log('[LOGIN] Admin DB error:', adminError);

      console.log('[LOGIN] Admin user data:', adminUser);

      console.log('[LOGIN] Admin password hash exists:', adminUser?.password_hash ? 'YES' : 'NO');



      if (!adminUser || !adminUser.password_hash) {

        console.log('[LOGIN] No user found in either table');

        return NextResponse.json({ error: 'Seller not found. Please join our waitlist to apply.' }, { status: 404 });

      }



      const isValid = await comparePassword(password, adminUser.password_hash);

      console.log('[LOGIN] Admin password valid:', isValid);

      if (!isValid) {

        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });

      }



      // Use admin.id as userId since we're not using Supabase Auth

      const token = await signJWT({ userId: adminUser.id, email: adminUser.email });



      const response = NextResponse.json({

        user: { id: adminUser.id, email: adminUser.email, isAdmin: true },

        accessToken: token,

      });



      // Set HTTP-only cookie

      response.cookies.set('token', token, {

        httpOnly: true,

        secure: process.env.NODE_ENV === 'production',

        sameSite: 'lax',

        maxAge: 60 * 60 * 24, // 24 hours

        path: '/',

      });



      return response;

    }



    const isValid = await comparePassword(password, user.password_hash);

    console.log('[LOGIN] Seller password valid:', isValid);

    if (!isValid) {

      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });

    }



    if (user.approval_status === 'rejected') {

      return NextResponse.json({ error: 'Your account has been rejected.' }, { status: 403 });

    }



    if (user.approval_status === 'pending') {

      return NextResponse.json({ error: 'Your account is pending approval.' }, { status: 403 });

    }



    // Use seller.id as userId since we're not using Supabase Auth

    const token = await signJWT({ userId: user.id, email: user.email });



    // Update last login

    await db

      .from('sellers')

      .update({ last_login: new Date().toISOString() })

      .eq('id', user.id);



    return NextResponse.json({

      user: {

        id: user.id,

        email: user.email,

        is_temp_password: user.is_temp_password ?? false,

        approval_status: user.approval_status,

        isAdmin: false,

      },

      accessToken: token,

    });

  } catch (err: any) {

    console.error('[LOGIN] error:', err);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });

  }

}

