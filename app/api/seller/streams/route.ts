import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/jwt';

async function authenticateRequest(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return null;
  }
  return verifyJWT(token);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const decoded = await authenticateRequest(request);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const statusQuery = url.searchParams.get('status');
    const limitParam = url.searchParams.get('limit');

    let streamQuery = db
      .from('stream_sessions')
      .select('*')
      .eq('seller_id', decoded.userId)
      .order('created_at', { ascending: false });

    if (statusQuery) {
      const statuses = statusQuery
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

      if (statuses.length > 0) {
        streamQuery = streamQuery.in('status', statuses);
      }
    }

    if (limitParam) {
      const limit = Number(limitParam);
      if (!Number.isNaN(limit) && limit > 0) {
        streamQuery = streamQuery.limit(limit);
      }
    }

    const { data: streams, error: streamsError } = await streamQuery;

    if (streamsError) {
      console.error('Error fetching streams:', streamsError);
      return NextResponse.json({ error: 'Failed to fetch streams' }, { status: 500 });
    }

    return NextResponse.json({ streams: streams || [] });
  } catch (error: any) {
    console.error('Streams API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyJWT(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, scheduled_start, status, platforms, products_featured } = body;

    if (!title || !scheduled_start || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: stream, error } = await db
      .from('stream_sessions')
      .insert({
        seller_id: decoded.userId,
        title,
        description: description || null,
        scheduled_start,
        status,
        platforms: platforms || [],
        products_featured: products_featured || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Stream creation error:', error);
      return NextResponse.json({ error: error.message || 'Failed to create stream' }, { status: 500 });
    }

    return NextResponse.json({ stream }, { status: 201 });
  } catch (error: any) {
    console.error('Stream creation API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyJWT(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { ids, status, title, description, scheduled_start, platforms, products_featured } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No stream IDs provided' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (scheduled_start !== undefined) updateData.scheduled_start = scheduled_start;
    if (platforms !== undefined) updateData.platforms = platforms;
    if (products_featured !== undefined) updateData.products_featured = products_featured;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No update fields provided' }, { status: 400 });
    }

    const { data, error } = await db
      .from('stream_sessions')
      .update(updateData)
      .in('id', ids)
      .eq('seller_id', decoded.userId);

    if (error) {
      console.error('Stream update error:', error);
      return NextResponse.json({ error: error.message || 'Failed to update streams' }, { status: 500 });
    }

    const updatedCount = Array.isArray(data as unknown) ? (data as unknown as Array<unknown>).length : 0;
    return NextResponse.json({ updated: updatedCount });
  } catch (error: any) {
    console.error('Stream update API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
