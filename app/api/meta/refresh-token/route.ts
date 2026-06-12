import { NextResponse } from 'next/server';
import { exchangeShortLivedToken } from '@/lib/meta-service';
import { createAdminSupabase } from '@/lib/supabase-admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const META_APP_ID = process.env.META_APP_ID || '';
const META_APP_SECRET = process.env.META_APP_SECRET || '';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { connectionId } = body;

    if (!connectionId) {
      return NextResponse.json({ error: 'connectionId is required' }, { status: 400 });
    }

    if (!META_APP_ID || !META_APP_SECRET) {
      return NextResponse.json({ error: 'Meta app credentials not configured' }, { status: 500 });
    }

    // Get authenticated user from session
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const cookieStore = await cookies();
    
    const supabase = createServerClient(supabaseUrl!, supabasePublishableKey!, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    });
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get connection using admin client
    const adminSupabase = createAdminSupabase();
    const { data: connection, error: connectionError } = await adminSupabase
      .from('platform_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('seller_id', user.id)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    if (connection.platform !== 'meta') {
      return NextResponse.json({ error: 'Not a Meta connection' }, { status: 400 });
    }

    const accessToken = connection.access_token || connection.metadata?.access_token;

    if (!accessToken) {
      return NextResponse.json({ error: 'No access token found to refresh' }, { status: 400 });
    }

    // Try to exchange the token for a new long-lived token
    let newToken = accessToken;
    try {
      const exchanged = await exchangeShortLivedToken(META_APP_ID, META_APP_SECRET, accessToken);
      newToken = exchanged.access_token;
      
      // Validate the new token
      const userUrl = new URL('https://graph.facebook.com/v19.0/me');
      userUrl.searchParams.set('access_token', newToken);
      userUrl.searchParams.set('fields', 'id,name');

      const userResponse = await fetch(userUrl.toString());
      const userData = await userResponse.json();

      if (!userResponse.ok || userData.error) {
        throw new Error(userData.error?.message || 'New token validation failed');
      }

      // Update connection with new token
      await adminSupabase
        .from('platform_connections')
        .update({
          access_token: newToken,
          platform_username: userData.name,
          platform_user_id: userData.id,
          metadata: {
            ...connection.metadata,
            access_token: newToken,
            pageName: userData.name,
            last_refreshed_at: new Date().toISOString(),
          },
        })
        .eq('id', connectionId);

      return NextResponse.json({ 
        success: true, 
        message: 'Token refreshed successfully',
        user: { id: userData.id, name: userData.name },
        last_refreshed_at: new Date().toISOString()
      }, { status: 200 });

    } catch (refreshError) {
      const message = refreshError instanceof Error ? refreshError.message : 'Token refresh failed';
      console.error('Meta token refresh error:', refreshError);
      
      // If refresh fails, indicate that re-authorization is needed
      return NextResponse.json({ 
        success: false, 
        error: message,
        needsReauth: true 
      }, { status: 200 });
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token refresh failed';
    console.error('Meta token refresh error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
