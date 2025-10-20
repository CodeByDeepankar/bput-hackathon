#!/usr/bin/env node

/**
 * Database Health Check Script
 * 
 * This script checks if all required database tables exist in Supabase.
 * Run this to diagnose database setup issues.
 * 
 * Usage: node scripts/check-database.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const requiredTables = [
  'subjects',
  'quizzes',
  'questions',
  'quiz_responses',
  'quiz_completions', // This is the missing table causing your error!
  'streaks',
  'student_progress',
  'user_roles',
  'achievements'
];

async function checkDatabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('\n🔍 Database Health Check\n');
  console.log('═'.repeat(50));

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables!');
    console.error('   Please check your .env file for:');
    console.error('   - SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('✅ Environment variables found');
  console.log(`📊 Supabase URL: ${supabaseUrl}`);
  console.log('');

  const supabase = createClient(supabaseUrl, supabaseKey);

  let allTablesExist = true;
  const missingTables = [];

  console.log('Checking tables...\n');

  for (const table of requiredTables) {
    try {
      // Try to query the table with a limit of 0 to just check existence
      const { error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.message.includes('does not exist') || 
            error.message.includes('not found') ||
            error.message.includes('schema cache')) {
          console.log(`❌ ${table.padEnd(20)} - MISSING`);
          missingTables.push(table);
          allTablesExist = false;
        } else {
          console.log(`⚠️  ${table.padEnd(20)} - ERROR: ${error.message}`);
          allTablesExist = false;
        }
      } else {
        console.log(`✅ ${table.padEnd(20)} - EXISTS`);
      }
    } catch (err) {
      console.log(`❌ ${table.padEnd(20)} - ERROR: ${err.message}`);
      missingTables.push(table);
      allTablesExist = false;
    }
  }

  console.log('\n' + '═'.repeat(50));

  if (allTablesExist) {
    console.log('\n✨ All required tables exist! Your database is ready.\n');
    process.exit(0);
  } else {
    console.log('\n❌ Database setup incomplete!\n');
    console.log('Missing tables:');
    missingTables.forEach(table => console.log(`   - ${table}`));
    console.log('\n📋 To fix this:\n');
    console.log('1. Open your Supabase Dashboard: https://app.supabase.com/');
    console.log('2. Go to SQL Editor');
    console.log('3. Run the SQL from: database-schema.sql');
    console.log('\n   OR\n');
    console.log('Run the automated setup:');
    console.log('   node scripts/setup-database.js\n');
    process.exit(1);
  }
}

checkDatabase().catch((error) => {
  console.error('\n❌ Error checking database:', error.message);
  process.exit(1);
});
