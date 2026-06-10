// Script to add admin and seller users to the database
// Run with: node scripts/add-users.js

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function addAdmin() {
  const email = 'team@scarerror.com';
  const password = 'scar1379';
  
  console.log(`Adding admin: ${email}`);
  
  // Check if admin already exists
  const { data: existingAdmin, error: checkError } = await db
    .from('admins')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();
  
  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking admin:', checkError);
    return;
  }
  
  if (existingAdmin) {
    console.log('Admin already exists, updating password...');
    const passwordHash = await hashPassword(password);
    
    const { error } = await db
      .from('admins')
      .update({ password_hash: passwordHash })
      .eq('email', email.toLowerCase().trim());
    
    if (error) {
      console.error('Error updating admin password:', error);
    } else {
      console.log('Admin password updated successfully');
    }
  } else {
    // Create new admin
    const adminId = uuidv4();
    const passwordHash = await hashPassword(password);
    
    const { error } = await db
      .from('admins')
      .insert({
        id: adminId,
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
      });
    
    if (error) {
      console.error('Error creating admin:', error);
    } else {
      console.log('Admin created successfully');
    }
  }
}

async function addSeller() {
  const email = 'imrabiatechdev@gmail.com';
  const password = 'BIYA1597';
  
  console.log(`Adding seller: ${email}`);
  
  // Check if seller already exists
  const { data: existingSeller, error: checkError } = await db
    .from('sellers')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();
  
  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking seller:', checkError);
    return;
  }
  
  if (existingSeller) {
    console.log('Seller already exists, updating password...');
    const passwordHash = await hashPassword(password);
    
    const { error } = await db
      .from('sellers')
      .update({ 
        password_hash: passwordHash,
        approval_status: 'approved'
      })
      .eq('email', email.toLowerCase().trim());
    
    if (error) {
      console.error('Error updating seller password:', error);
    } else {
      console.log('Seller password updated successfully');
    }
  } else {
    // Create new seller
    const sellerId = uuidv4();
    const passwordHash = await hashPassword(password);
    
    const { error } = await db
      .from('sellers')
      .insert({
        id: sellerId,
        email: email.toLowerCase().trim(),
        phone: '+923001234567', // Default phone, should be updated
        password_hash: passwordHash,
        approval_status: 'approved',
        is_temp_password: false,
        stripe_onboarding_status: 'pending',
      });
    
    if (error) {
      console.error('Error creating seller:', error);
    } else {
      console.log('Seller created successfully');
    }
  }
}

async function main() {
  try {
    await addAdmin();
    await addSeller();
    console.log('\n✅ All users added/updated successfully');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
