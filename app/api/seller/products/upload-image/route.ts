import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/jwt';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error('Missing Supabase credentials');
}

// Create Supabase client with service role key for storage operations
const supabaseStorage = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const productId = formData.get('productId') as string;

    if (!file || !productId) {
      return NextResponse.json({ error: 'File and productId are required' }, { status: 400 });
    }

    // Verify the product belongs to the seller
    const { data: product, error: productError } = await db
      .from('products')
      .select('seller_id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Verify the seller belongs to the user
    const { data: seller, error: sellerError } = await db
      .from('sellers')
      .select('id')
      .eq('id', product.seller_id)
      .eq('id', decoded.userId)
      .single();

    if (sellerError || !seller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Upload file to Supabase storage
    const fileName = `${productId}/${Date.now()}-${file.name}`;
    
    // Check if bucket exists, if not return helpful error
    try {
      const { data: buckets } = await supabaseStorage.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === 'product-images');
      
      if (!bucketExists) {
        console.error('Storage bucket product-images does not exist');
        return NextResponse.json({ 
          error: 'Storage bucket not configured. Please create "product-images" bucket in Supabase Dashboard.' 
        }, { status: 500 });
      }
    } catch (bucketError) {
      console.error('Error checking buckets:', bucketError);
    }

    const { error: uploadError } = await supabaseStorage.storage
      .from('product-images')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Image upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseStorage.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return NextResponse.json({ imageUrl: publicUrl }, { status: 200 });
  } catch (error: any) {
    console.error('Image upload API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
