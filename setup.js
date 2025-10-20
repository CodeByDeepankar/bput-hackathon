#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Setting up GYANARATNA Platform...\n');

// Function to run command and return promise
function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    const process = spawn(command, args, { 
      cwd, 
      stdio: 'inherit',
      shell: true 
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    process.on('error', reject);
  });
}

async function setup() {
  try {
    // Install frontend dependencies
    console.log('📦 Installing frontend dependencies...');
    await runCommand('npm', ['install'], path.join(__dirname, 'frontend'));
    
    console.log('\n✅ Setup completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Create or configure your Supabase project (https://supabase.com)');
  console.log('2. Update frontend/.env.local with your Supabase credentials');
  console.log('3. Run: cd frontend && npm run dev');
  console.log('4. Visit: http://localhost:3000');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setup();
