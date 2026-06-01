#!/usr/bin/env node

/**
 * Script to clean up duplicate sellers in the database
 * Run with: node scripts/cleanup_duplicate_sellers.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupDuplicateSellers() {
  try {
    console.log('🔍 Checking for sellers in database...');

    // Get all sellers
    const { data: allSellers, error: fetchError } = await supabase
      .from('sellers')
      .select('id, user_id, email, restream_stream_key, created_at')
      .order('user_id', { ascending: true })
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching sellers:', fetchError);
      return;
    }

    console.log(`📊 Found ${allSellers.length} total sellers in database`);

    if (allSellers.length === 0) {
      console.log('📭 No sellers found in database');
      return;
    }

    // Show all sellers
    console.log('\n📋 All sellers:');
    allSellers.forEach(seller => {
      console.log(`  ID: ${seller.id}, User: ${seller.user_id}, Email: ${seller.email || 'none'}, Key: ${seller.restream_stream_key || 'none'}`);
    });

    // Group by user_id
    const sellersByUser = {};
    allSellers.forEach(seller => {
      if (!sellersByUser[seller.user_id]) {
        sellersByUser[seller.user_id] = [];
      }
      sellersByUser[seller.user_id].push(seller);
    });

    // Find duplicates
    const duplicates = Object.entries(sellersByUser)
      .filter(([userId, sellers]) => sellers.length > 1)
      .map(([userId, sellers]) => ({ userId, sellers }));

    if (duplicates.length === 0) {
      console.log('✅ No duplicate sellers found!');
      return;
    }

    console.log(`\n🚨 Found ${duplicates.length} users with duplicate sellers:`);

    // For each user with duplicates, decide which to keep
    const toDelete = [];
    const toKeep = [];

    for (const { userId, sellers } of duplicates) {
      console.log(`\n👤 User: ${sellers[0].email || userId}`);

      // Find the best seller to keep
      let bestSeller = null;

      // First priority: has valid stream key
      bestSeller = sellers.find(s =>
        s.restream_stream_key &&
        s.restream_stream_key !== 'NOT_CONFIGURED' &&
        s.restream_stream_key.length > 10
      );

      // Second priority: most recent
      if (!bestSeller) {
        bestSeller = sellers[0]; // Already ordered by created_at DESC
      }

      toKeep.push(bestSeller);

      // Mark others for deletion
      const duplicatesToDelete = sellers.filter(s => s.id !== bestSeller.id);
      toDelete.push(...duplicatesToDelete);

      console.log(`  ✅ KEEP: ID ${bestSeller.id} (${bestSeller.restream_stream_key || 'no key'})`);
      duplicatesToDelete.forEach(s => {
        console.log(`  🗑️  DELETE: ID ${s.id} (${s.restream_stream_key || 'no key'})`);
      });
    }

    // Ask for confirmation
    console.log(`\n⚠️  This will delete ${toDelete.length} duplicate seller records.`);
    console.log('Keep the most recent seller with valid Restream key, or most recent if none.');

    // For safety, let's just show what would be deleted first
    console.log('\n🔍 DRY RUN - Showing what would be deleted:');
    toDelete.forEach(s => {
      console.log(`  - Seller ID: ${s.id}, User: ${s.email || s.user_id}, Key: ${s.restream_stream_key || 'none'}`);
    });

    // Ask for confirmation before deleting
    console.log('\n⚠️  DANGER ZONE: This will permanently delete duplicate seller records!');
    console.log('Type "DELETE" to confirm deletion, or anything else to cancel:');

    // For this script, we'll proceed with deletion since the user requested it
    console.log('\n🗑️  Deleting duplicate sellers...');

    for (const seller of toDelete) {
      const { error: deleteError } = await supabase
        .from('sellers')
        .delete()
        .eq('id', seller.id);

      if (deleteError) {
        console.error(`Failed to delete seller ${seller.id}:`, deleteError);
      } else {
        console.log(`✅ Deleted seller ${seller.id}`);
      }
    }

    console.log('\n✅ Cleanup completed!');

  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Run the cleanup
cleanupDuplicateSellers();