import { NextRequest, NextResponse } from 'next/server';
import { comparePassword, hashPassword } from '@/lib/password';
import { verifyJWT, extractToken } from '@/lib/jwt';
import { db } from '@/lib/db';

interface AccountUpdateBody {
  name?: string;
  email?: string;
  phone?: string;
  currentPassword?: string;
  newPassword?: string;
}

async function getPayload(request: NextRequest) {
  const token = extractToken(request.headers);
  if (!token) return null;
  return verifyJWT(token);
}

export async function PATCH(request: NextRequest) {
  const payload = await getPayload(request);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as AccountUpdateBody;
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };

  if (body.name) updates.name = body.name;
  if (body.phone) updates.phone = body.phone;

  try {
    if (body.newPassword && body.currentPassword) {
      const { data: seller } = await db
        .from('sellers')
        .select('password_hash')
        .eq('id', payload.userId)
        .maybeSingle();

      if (!seller?.password_hash) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const isValid = await comparePassword(body.currentPassword, seller.password_hash);
      if (!isValid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
      }

      updates.password_hash = await hashPassword(body.newPassword);
      updates.is_temp_password = false;
    }

    const { error: sellerError } = await db
      .from('sellers')
      .update(updates)
      .eq('id', payload.userId);

    if (sellerError) {
      console.error('Account update error:', sellerError);
      return NextResponse.json({ error: sellerError.message || 'Failed to update account' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Account updated successfully' });
  } catch (error: any) {
    console.error('Account update error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update account' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const payload = await getPayload(request);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { error } = await db
      .from('sellers')
      .update({ approval_status: 'deleted', password_hash: null, updated_at: new Date().toISOString() })
      .eq('id', payload.userId);

    if (error) {
      console.error('Account deletion error:', error);
      return NextResponse.json({ error: error.message || 'Failed to delete account' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Account deleted successfully' });
  } catch (error: any) {
    console.error('Account deletion error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete account' }, { status: 500 });
  }
}
