import { NextResponse } from 'next/server';
import { sendPasswordResetEmail } from '@/lib/resend';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    console.log('Testing email to:', email);
    console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
    console.log('FROM_EMAIL:', process.env.FROM_EMAIL);

    const testUrl = 'http://localhost:3000/reset-password?token=test123';
    const result = await sendPasswordResetEmail(email, testUrl);
    
    console.log('Email send result:', result);
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Email sent! Check your inbox (and spam folder).' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }
  } catch (err: any) {
    console.error('Test email error:', err);
    return NextResponse.json({ 
      error: err.message 
    }, { status: 500 });
  }
}
