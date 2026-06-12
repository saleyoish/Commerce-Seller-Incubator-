// Test JWT endpoint for debugging
import { NextResponse } from 'next/server';
import { signJWT, verifyJWT } from '@/lib/jwt';

export async function GET() {
  try {
    console.log('[TEST-JWT] Testing JWT system...');
    console.log('[TEST-JWT] JWT_SECRET configured:', process.env.JWT_SECRET ? 'YES' : 'NO');
    
    // Test token generation
    const testPayload = { userId: 'test-user-id', email: 'test@example.com' };
    const token = await signJWT(testPayload);
    console.log('[TEST-JWT] Token generated:', token ? 'YES' : 'NO');
    
    // Test token verification
    const verified = await verifyJWT(token);
    console.log('[TEST-JWT] Token verified:', verified ? 'YES' : 'NO');
    
    if (verified) {
      console.log('[TEST-JWT] Verified payload:', verified);
    }
    
    return NextResponse.json({
      success: true,
      message: 'JWT system is working',
      tokenGenerated: !!token,
      tokenVerified: !!verified,
      payload: verified,
    });
  } catch (error) {
    console.error('[TEST-JWT] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
