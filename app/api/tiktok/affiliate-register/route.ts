import { NextRequest, NextResponse } from 'next/server';
import { createServerSideSupabase } from '@/lib/supabase-server';

// POST - Register seller as TikTok Shop affiliate
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSideSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { businessType, taxId, businessName, businessAddress } = await request.json();

    // Validate required fields
    if (!businessType || !businessName) {
      return NextResponse.json(
        { error: 'Business type and name are required' },
        { status: 400 }
      );
    }

    // Get seller record
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    // Update seller with affiliate registration info
    const { error: updateError } = await supabase
      .from('sellers')
      .update({
        tiktok_affiliate_status: 'pending',
        tiktok_business_type: businessType,
        tiktok_business_name: businessName,
        tiktok_tax_id: taxId || null,
        tiktok_business_address: businessAddress || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', seller.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // In production, this would call TikTok's affiliate registration API
    // For now, we'll simulate the registration
    
    return NextResponse.json({
      success: true,
      message: 'Affiliate registration submitted successfully',
      affiliateId: `TTK-${seller.id.slice(0, 8).toUpperCase()}`,
    });

  } catch (error: any) {
    console.error('TikTok affiliate registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Check affiliate registration status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSideSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('tiktok_affiliate_status, tiktok_business_name, tiktok_business_type')
      .eq('user_id', user.id)
      .single();

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: seller.tiktok_affiliate_status || 'not_registered',
      businessName: seller.tiktok_business_name,
      businessType: seller.tiktok_business_type,
    });

  } catch (error: any) {
    console.error('Affiliate status check error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
