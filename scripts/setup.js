#!/usr/bin/env node

/**
 * Setup script for image hosting configuration
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🚀 PinRanks Image Hosting Setup');
  console.log('================================\n');
  
  // Get Firebase project ID
  const projectId = await question('Enter your Firebase project ID: ');
  
  if (!projectId || projectId === 'YOUR_PROJECT_ID') {
    console.log('❌ Please provide a valid Firebase project ID');
    process.exit(1);
  }
  
  // Update config file
  const configPath = path.join(__dirname, '../src/config.js');
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  configContent = configContent.replace(
    /projectId:\s*['"`][^'"`]*['"`]/,
    `projectId: '${projectId}'`
  );
  
  fs.writeFileSync(configPath, configContent);
  
  console.log('✅ Updated src/config.js with your project ID');
  
  // Check if Firebase CLI is installed
  try {
    require('child_process').execSync('firebase --version', { stdio: 'ignore' });
    console.log('✅ Firebase CLI is installed');
  } catch (error) {
    console.log('⚠️  Firebase CLI not found. Please install it:');
    console.log('   npm install -g firebase-tools');
  }
  
  // Check if functions dependencies are installed
  const functionsPackagePath = path.join(__dirname, '../functions/package.json');
  if (fs.existsSync(functionsPackagePath)) {
    console.log('✅ Firebase Functions package.json found');
  } else {
    console.log('❌ Firebase Functions not found. Please run:');
    console.log('   firebase init functions');
  }
  
  console.log('\n📋 Next steps:');
  console.log('1. Install Firebase Functions dependencies:');
  console.log('   cd functions && npm install');
  console.log('');
  console.log('2. Deploy Firebase Functions:');
  console.log('   firebase deploy --only functions');
  console.log('');
  console.log('3. Configure Firebase Storage rules (see IMAGE_SETUP.md)');
  console.log('');
  console.log('4. Test the setup:');
  console.log('   node scripts/downloadImages.js --limit=5 --dry-run');
  console.log('');
  console.log('✨ Setup complete! Check IMAGE_SETUP.md for detailed instructions.');
  
  rl.close();
}

main().catch(console.error); 