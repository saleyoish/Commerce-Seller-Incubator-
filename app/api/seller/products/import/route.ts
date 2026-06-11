import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyJWT } from '@/lib/jwt';

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
    const { seller_id, csvData } = body;

    // Validate required fields
    if (!seller_id || !csvData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the seller belongs to the user
    const { data: seller, error: sellerError } = await db
      .from('sellers')
      .select('id')
      .eq('id', seller_id)
      .eq('id', decoded.userId)
      .maybeSingle();

    if (sellerError) {
      console.error('Seller verification error:', sellerError);
      return NextResponse.json({ error: 'Database error during seller verification' }, { status: 500 });
    }

    if (!seller) {
      console.error('Seller not found or unauthorized:', { seller_id, userId: decoded.userId });
      return NextResponse.json({ error: 'Seller not found or unauthorized' }, { status: 403 });
    }

    // Parse CSV data
    const rows = csvData.split('\n').filter((row: string) => row.trim());
    const headers = rows[0].split(',').map((h: string) => h.trim().toLowerCase());

    // Validate headers
    const requiredHeaders = ['name', 'price', 'category', 'stock_quantity'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return NextResponse.json({ error: `Missing required columns: ${missingHeaders.join(', ')}` }, { status: 400 });
    }

    const productsToInsert = [];
    const productsToUpdate = [];
    let duplicateCount = 0;

    for (let i = 1; i < rows.length; i++) {
      const values = rows[i].split(',').map((v: string) => v.trim());
      const product: any = { seller_id, status: 'active' };

      headers.forEach((header: string, index: number) => {
        if (values[index]) {
          if (header === 'price') {
            product[header] = parseFloat(values[index]);
          } else if (header === 'stock_quantity') {
            product[header] = parseInt(values[index]);
          } else if (header === 'images') {
            // Handle images as comma-separated URLs
            product[header] = values[index].split(',').map((url: string) => url.trim());
          } else {
            product[header] = values[index];
          }
        }
      });

      if (product.name && product.price) {
        // Check for duplicate by SKU if provided
        if (product.sku) {
          const { data: existingProduct } = await db
            .from('products')
            .select('id')
            .eq('seller_id', seller_id)
            .eq('sku', product.sku)
            .maybeSingle();

          if (existingProduct) {
            // Update existing product
            productsToUpdate.push({ ...product, id: existingProduct.id });
            duplicateCount++;
            continue;
          }
        }
        productsToInsert.push(product);
      }
    }

    if (productsToInsert.length === 0 && productsToUpdate.length === 0) {
      return NextResponse.json({ error: 'No valid products found in CSV' }, { status: 400 });
    }

    // Insert new products
    if (productsToInsert.length > 0) {
      const { error: insertError } = await db
        .from('products')
        .insert(productsToInsert);
      if (insertError) {
        console.error('Insert error:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    // Update existing products
    if (productsToUpdate.length > 0) {
      for (const product of productsToUpdate) {
        const { id, ...updateData } = product;
        const { error: updateError } = await db
          .from('products')
          .update(updateData)
          .eq('id', id);
        if (updateError) {
          console.error('Update error:', updateError);
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }
      }
    }

    let message = `Successfully imported ${productsToInsert.length} products!`;
    if (duplicateCount > 0) {
      message += ` Updated ${duplicateCount} existing products (matched by SKU).`;
    }

    return NextResponse.json({ 
      success: true, 
      message,
      importedCount: productsToInsert.length,
      updatedCount: duplicateCount 
    }, { status: 201 });
  } catch (error: any) {
    console.error('CSV import API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
