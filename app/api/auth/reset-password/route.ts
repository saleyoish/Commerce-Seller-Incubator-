import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPasswordResetEmail } from '@/lib/resend';
import { getCookieConfig } from '@/lib/cookie-config';

export async function POST(request: Request) {
  try {
    const { email, redirectTo } = await request.json();

    if (!email || !redirectTo) {
      return NextResponse.json(
        { error: 'Email and redirectTo are required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    
    // Use service role key for admin operations (bypasses rate limits)
    const serviceRoleKey = process.env.SUPABASE_SECRET_KEY;
    
    if (!serviceRoleKey) {
      console.warn('SUPABASE_SECRET_KEY not set, falling back to SSR client with potential rate limits');
    }
    
    // Use admin client if service role key available, otherwise use SSR client
    let error;
    
    if (serviceRoleKey) {
      // Admin client with service role key - bypasses rate limits
      console.log('Using admin client with service role key');
      
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );
      
      const result = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo,
        },
      });
      
      error = result.error;
      
      console.log('Generate link result:', { 
        error: result.error?.message || null, 
        hasData: !!result.data,
        hasActionLink: !!result.data?.properties?.action_link 
      });
      
      // If link generated successfully, send email via Resend
      if (!error && result.data?.properties?.action_link) {
        const resetUrl = result.data.properties.action_link;
        console.log('Generated reset link:', resetUrl);
        
        // Check if Resend is configured
        if (!process.env.RESEND_API_KEY) {
          console.error('RESEND_API_KEY not set - cannot send email');
          return NextResponse.json(
            { error: 'Email service not configured. Please contact support.' },
            { status: 500 }
          );
        }
        
        const emailResult = await sendPasswordResetEmail(email, resetUrl);
        console.log('Resend email result:', emailResult);
        
        if (!emailResult.success) {
          console.error('Failed to send password reset email via Resend:', emailResult.error);
          return NextResponse.json(
            { error: 'Failed to send email. Please try again later.' },
            { status: 500 }
          );
        }
      }
    } else {
      console.log('SUPABASE_SECRET_KEY not set, using SSR client fallback');
      // Fallback to SSR client (may have rate limits)
      const cookieConfig = getCookieConfig();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: any) {
              cookieStore.set({
                name,
                value,
                ...options,
                ...cookieConfig,
                path: cookieConfig.path,
              });
            },
            remove(name: string, options: any) {
              cookieStore.set({
                name,
                value: '',
                ...options,
                ...cookieConfig,
                path: cookieConfig.path,
              });
            },
          },
        }
      );
      
      const result = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      
      error = result.error;
    }

    if (error) {
      console.error('Server password reset error:', error);
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }

    console.log('Password reset flow completed successfully for:', email);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
