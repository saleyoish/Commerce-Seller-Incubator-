import { NextResponse } from 'next/server';
import { verifyJWT, extractToken } from '@/lib/jwt';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { connectionId } = body;

    if (!connectionId) {
      return NextResponse.json({ error: 'connectionId is required' }, { status: 400 });
    }

    // Get JWT token from headers
    const token = extractToken(request.headers);

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const payload = await verifyJWT(token);

    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get connection using db client
    const { data: connection, error: connectionError } = await db
      .from('platform_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('seller_id', payload.userId)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    if (connection.platform !== 'meta') {
      return NextResponse.json({ error: 'Not a Meta connection' }, { status: 400 });
    }

    const accessToken = connection.access_token || connection.metadata?.access_token;

    if (!accessToken) {
      return NextResponse.json({ valid: false, error: 'No access token found' }, { status: 200 });
    }

    // Validate token by fetching user info from Meta Graph API
    const userUrl = new URL('https://graph.facebook.com/v19.0/me');
    userUrl.searchParams.set('access_token', accessToken);
    userUrl.searchParams.set('fields', 'id,name');

    const response = await fetch(userUrl.toString());
    const data = await response.json();

    if (!response.ok || data.error) {
      const errorMsg = data.error?.message || 'Token validation failed';
      console.error('Meta token validation error:', data.error);
      
      // Check if error is due to expired token
      if (data.error?.code === 190 || data.error?.type === 'OAuthException') {
        return NextResponse.json({ 
          valid: false, 
          error: errorMsg, 
          expired: true,
          needsReauth: true 
        }, { status: 200 });
      }
      
      return NextResponse.json({ valid: false, error: errorMsg }, { status: 200 });
    }

    // Token is valid, update connection with latest user info
    await db
      .from('platform_connections')
      .update({
        platform_username: data.name,
        platform_user_id: data.id,
        metadata: {
          ...connection.metadata,
          pageName: data.name,
          last_validated_at: new Date().toISOString(),
        },
      })
      .eq('id', connectionId);

    return NextResponse.json({ 
      valid: true, 
      user: { id: data.id, name: data.name },
      last_validated_at: new Date().toISOString()
    }, { status: 200 });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token validation failed';
    console.error('Meta token validation error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
