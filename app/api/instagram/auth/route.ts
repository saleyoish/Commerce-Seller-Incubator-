import { NextResponse } from 'next/server';

const META_APP_ID = process.env.META_APP_ID || '';
const REDIRECT_URI = process.env.NEXT_PUBLIC_SITE_URL + '/api/instagram/callback';

// Scopes required for Instagram Business/Creator account access
const SCOPES = [
  'business_management',
  'catalog_management',
  'instagram_basic',
  'instagram_content_publish',
  'pages_show_list',
].join(',');

export async function POST() {
  try {
    if (!META_APP_ID) {
      return NextResponse.json(
        { error: 'Facebook/Meta app ID not configured' },
        { status: 500 }
      );
    }

    // Generate auth URL
    const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
    authUrl.searchParams.set('client_id', META_APP_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', Buffer.from(JSON.stringify({ timestamp: Date.now() })).toString('base64'));

    return NextResponse.json(
      { authUrl: authUrl.toString() },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate auth URL';
    console.error('Instagram auth error:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
