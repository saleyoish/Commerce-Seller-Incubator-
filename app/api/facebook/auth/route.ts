import { NextResponse } from 'next/server';

const META_APP_ID = process.env.META_APP_ID || '';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const REDIRECT_URI = SITE_URL + '/api/facebook/callback';

// Scopes required for product catalog access (minimal scopes for quick connection)
const SCOPES = [
  'pages_show_list',
].join(',');

export async function POST(request: Request) {
  try {
    if (!META_APP_ID) {
      return NextResponse.json(
        { error: 'Facebook app ID not configured' },
        { status: 500 }
      );
    }

    // Get JWT token from request body
    const body = await request.json();
    const token = body.token;
    
    console.log('[FACEBOOK-AUTH] JWT token present:', !!token);

    // Generate auth URL with JWT token in state parameter
    const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
    authUrl.searchParams.set('client_id', META_APP_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('response_type', 'code');
    
    // Include JWT token in state parameter to preserve session
    const state = Buffer.from(JSON.stringify({ 
      timestamp: Date.now(),
      token: token || null 
    })).toString('base64');
    authUrl.searchParams.set('state', state);

    console.log('[FACEBOOK-AUTH] Auth URL generated with token in state');
    
    return NextResponse.json(
      { authUrl: authUrl.toString() },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate auth URL';
    console.error('[FACEBOOK-AUTH] Error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
