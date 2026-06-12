import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, extractToken } from '@/lib/jwt';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const token = extractToken(request.headers);
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const connectionId = body.connectionId as string | undefined;

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 });
    }

    const { data: existingConnection, error: fetchError } = await db
      .from('platform_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('seller_id', payload.userId)
      .eq('platform', 'meta')
      .maybeSingle();

    if (fetchError) {
      console.error('[FACEBOOK-DISCONNECT] Connection fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch connection' }, { status: 500 });
    }

    if (!existingConnection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    const updatePayload = {
      status: 'disconnected',
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      metadata: {
        ...existingConnection.metadata,
        disconnectedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await db
      .from('platform_connections')
      .update(updatePayload)
      .eq('id', connectionId)
      .eq('seller_id', payload.userId);

    if (updateError) {
      console.error('[FACEBOOK-DISCONNECT] Connection update error:', updateError);
      return NextResponse.json({ error: 'Failed to disconnect connection' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[FACEBOOK-DISCONNECT] unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
