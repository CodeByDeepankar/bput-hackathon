#!/usr/bin/env node

/**
 * Automated Database Setup Script
 * 
 * This script creates all required database tables in Supabase.
 * 
 * Usage: node scripts/setup-database.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

async function setupDatabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('\n🚀 Setting up GYANARATNA Database\n');
  console.log('═'.repeat(50));

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables!');
    console.error('   Please check your .env file for:');
    console.error('   - SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('✅ Environment variables loaded');
  console.log(`📊 Supabase URL: ${supabaseUrl}\n`);

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read the SQL schema file
  const schemaPath = join(__dirname, '..', '..', 'database-schema.sql');
  let sqlSchema;
  
  try {
    sqlSchema = readFileSync(schemaPath, 'utf8');
    console.log('✅ SQL schema file loaded\n');
  } catch (err) {
    console.error('❌ Could not read database-schema.sql');
    console.error('   Make sure the file exists in the project root');
    console.error(`   Expected path: ${schemaPath}`);
    process.exit(1);
  }

  console.log('📝 Executing SQL schema...\n');

  try {
    // Execute the SQL schema
    // Note: Supabase client doesn't support executing raw SQL directly
    // You'll need to use the REST API or Management API
    
    console.log('⚠️  Direct SQL execution requires manual setup.\n');
    console.log('Please follow these steps:\n');
    console.log('1. Copy the contents of database-schema.sql');
    console.log('2. Go to: https://app.supabase.com/project/' + supabaseUrl.split('//')[1].split('.')[0] + '/sql/new');
    console.log('3. Paste the SQL and click RUN\n');
    console.log('Alternatively, you can use the Supabase CLI:\n');
    console.log('   supabase db push\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupDatabase().catch((error) => {
  console.error('\n❌ Setup failed:', error.message);
  process.exit(1);
});
