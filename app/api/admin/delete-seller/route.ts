import { NextRequest, NextResponse } from 'next/server';
import { createServerSideSupabase } from '@/lib/supabase-server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerSideSupabase();
    
    // Get current user (admin)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin status
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { sellerId } = body;

    if (!sellerId) {
      return NextResponse.json({ error: 'Seller ID required' }, { status: 400 });
    }

    // Get seller details before deletion for logging
    const { data: seller } = await supabase
      .from('sellers')
      .select('email, user_id')
      .eq('id', sellerId)
      .single();

    if (!seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    // Delete seller's data from all related tables
    const deletionSteps = [
      // 1. Delete stream sessions
      supabase.from('stream_sessions').delete().eq('seller_id', sellerId),
      
      // 2. Delete products
      supabase.from('products').delete().eq('seller_id', sellerId),
      
      // 3. Delete platform connections
      supabase.from('platform_connections').delete().eq('seller_id', sellerId),
      
      // 4. Delete tiktok_shop_connections
      supabase.from('tiktok_shop_connections').delete().eq('seller_id', sellerId),
      
      // 5. Delete referrals made by this seller
      supabase.from('referrals').delete().eq('referrer_id', seller.user_id),
      
      // 6. Delete sales records
      supabase.from('sales').delete().eq('seller_id', sellerId),
      
      // 7. Delete the seller record
      supabase.from('sellers').delete().eq('id', sellerId),
      
      // 8. Delete the user's auth account
      supabase.auth.admin.deleteUser(seller.user_id)
    ];

    // Execute all deletion steps
    for (const step of deletionSteps) {
      await step;
    }

    console.log(`Seller deleted: ${seller.email} (ID: ${sellerId}) by admin: ${user.email}`);

    return NextResponse.json({
      success: true,
      message: `Seller ${seller.email} and all associated data have been permanently deleted`
    });

  } catch (error: any) {
    console.error('Error deleting seller:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete seller' },
      { status: 500 }
    );
  }
}
