#!/usr/bin/env node

/**
 * Script to batch download images from OPDB and store them in Firebase Storage
 * 
 * Usage:
 *   node scripts/downloadImages.js [--limit=100] [--priority=modern]
 * 
 * Options:
 *   --limit    Number of images to download (default: 100)
 *   --priority 'all', 'lcd', 'dmd', or 'modern' (lcd+dmd)
 *   --dry-run  Don't actually download, just show what would be downloaded
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  limit: 100,
  dryRun: false,
  priority: 'all' // 'all', 'lcd', 'dmd', 'modern' (lcd+dmd)
};

args.forEach(arg => {
  if (arg.startsWith('--limit=')) {
    options.limit = parseInt(arg.split('=')[1]);
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg.startsWith('--priority=')) {
    options.priority = arg.split('=')[1];
  }
});

// Load machines data
const machinesPath = path.join(__dirname, '../public/machines.json');
const machines = JSON.parse(fs.readFileSync(machinesPath, 'utf8'));

// Load configuration
const configPath = path.join(__dirname, '../src/config.js');
const configContent = fs.readFileSync(configPath, 'utf8');
const projectIdMatch = configContent.match(/projectId:\s*['"`]([^'"`]+)['"`]/);
const projectId = projectIdMatch ? projectIdMatch[1] : 'YOUR_PROJECT_ID';

// Firebase Functions URL
const FIREBASE_FUNCTIONS_URL = `https://us-central1-${projectId}.cloudfunctions.net`;

// Progress tracking file
const progressFile = path.join(__dirname, `../.download-progress-${options.priority}.json`);

function loadProgress() {
  try {
    if (fs.existsSync(progressFile)) {
      return JSON.parse(fs.readFileSync(progressFile, 'utf8'));
    }
  } catch (error) {
    console.log('Could not load progress file, starting from beginning');
  }
  return { processed: 0, lastMachine: null };
}

function saveProgress(processed, lastMachine) {
  try {
    fs.writeFileSync(progressFile, JSON.stringify({ processed, lastMachine }, null, 2));
  } catch (error) {
    console.log('Could not save progress file');
  }
}

async function checkImageStatus(machines) {
  try {
    console.log(`🔍 Checking image status for ${machines.length} machines...`);
    
    const response = await axios.post(`${FIREBASE_FUNCTIONS_URL}/checkImageStatus`, {
      machines: machines
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    return response.data.results;
  } catch (error) {
    console.log(`❌ Error checking image status: ${error.message}`);
    return {};
  }
}

async function downloadMachineImages(machine) {
  if (!machine?.images) {
    console.log(`❌ No images found for ${machine.opdb_id}`);
    return { success: false, error: 'No images found' };
  }
  
  const backglass = machine.images.find(img => img.type === 'backglass');
  if (!backglass?.urls) {
    console.log(`❌ No backglass images found for ${machine.opdb_id}`);
    return { success: false, error: 'No backglass images found' };
  }
  
  try {
    console.log(`📥 Processing images for ${machine.opdb_id} (${machine.name})...`);
    
    if (options.dryRun) {
      console.log(`   Would download: ${Object.keys(backglass.urls).join(', ')}`);
      return { success: true, dryRun: true };
    }
    
    const response = await axios.post(`${FIREBASE_FUNCTIONS_URL}/downloadMachineImages`, {
      opdbId: machine.opdb_id,
      imageUrls: backglass.urls
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.data.success) {
      const actions = response.data.actions || {};
      const downloaded = Object.values(actions).filter(a => a === 'downloaded').length;
      const skipped = Object.values(actions).filter(a => a === 'skipped').length;
      

      
      if (downloaded > 0) {
        console.log(`✅ Downloaded ${downloaded} new images for ${machine.opdb_id}`);
      } else if (skipped > 0) {
        console.log(`⏭️  Skipped ${skipped} existing images for ${machine.opdb_id}`);
      } else {
        console.log(`✅ Processed images for ${machine.opdb_id}`);
      }
      
      return { ...response.data, downloaded, skipped };
    } else {
      console.log(`❌ Failed to process images for ${machine.opdb_id}: ${response.data.error}`);
      return { success: false, error: response.data.error };
    }
  } catch (error) {
    console.log(`❌ Error processing images for ${machine.opdb_id}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Import shared filter utilities
import { getFilterGroup, filterMachinesByPriority } from '../src/utils/filterUtils.js';

// Map priority options to their corresponding filter groups
const PRIORITY_TO_FILTER_MAP = {
  'alphanumeric': 'Solid State',
  'reels': 'EM',
  'dmd': 'DMD',
  'lcd': 'Modern',
  'modern': 'modern',
  'all': 'all'
};

async function main() {
  console.log(`🚀 Starting image download process...`);
  console.log(`   Total machines: ${machines.length}`);
  console.log(`   Limit: ${options.limit}`);
  console.log(`   Priority: ${options.priority}`);
  console.log(`   Dry run: ${options.dryRun}`);
  console.log('');
  
  // Load progress
  const progress = loadProgress();
  console.log(`📊 Progress: ${progress.processed} machines processed so far`);
  if (progress.lastMachine) {
    console.log(`   Last machine: ${progress.lastMachine}`);
  }
  console.log('');
  
  // Map priority to filter group and filter machines
  const filterGroup = PRIORITY_TO_FILTER_MAP[options.priority] || options.priority;
  const filteredMachines = filterMachinesByPriority(machines, filterGroup);
  console.log(`📊 Priority filtering:`);
  console.log(`   Total machines: ${machines.length}`);
  console.log(`   After ${options.priority} filter: ${filteredMachines.length}`);
  console.log(`   Filter group used: ${filterGroup}`);
  console.log('');
  
  // Start from where we left off
  const startIndex = progress.processed;
  const machinesToProcess = filteredMachines.slice(startIndex, startIndex + options.limit);
  
  console.log(`📊 Processing:`);
  console.log(`   Total ${options.priority} machines: ${filteredMachines.length}`);
  console.log(`   Starting from index: ${startIndex}`);
  console.log(`   Processing next ${options.limit} machines`);
  console.log(`   (Deduplication will skip any that already exist)`);
  console.log('');
  
  if (machinesToProcess.length === 0) {
    console.log(`✅ All ${options.priority} machines have been processed!`);
    return;
  }
  
  const results = {
    total: machinesToProcess.length,
    successful: 0,
    failed: 0,
    downloaded: 0,
    skipped: 0,
    errors: []
  };
  
  for (let i = 0; i < machinesToProcess.length; i++) {
    const machine = machinesToProcess[i];
    const result = await downloadMachineImages(machine);
    
    if (result.success) {
      results.successful++;
      results.downloaded += result.downloaded || 0;
      results.skipped += result.skipped || 0;
    } else {
      results.failed++;
      results.errors.push({
        opdbId: machine.opdb_id,
        name: machine.name,
        error: result.error
      });
    }
    
    // Save progress after each machine
    saveProgress(startIndex + i + 1, machine.opdb_id);
    
    // Add a small delay to be respectful to the servers
    if (!options.dryRun && i < machinesToProcess.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('');
  console.log(`📊 Download Summary:`);
  console.log(`   Total processed: ${results.total}`);
  console.log(`   Successful: ${results.successful}`);
  console.log(`   Failed: ${results.failed}`);
  console.log(`   New images downloaded: ${results.downloaded}`);
  console.log(`   Images skipped (already existed): ${results.skipped}`);
  console.log(`   Progress saved: ${startIndex + results.total}/${filteredMachines.length} ${options.priority} machines`);
  
  if (results.errors.length > 0) {
    console.log('');
    console.log(`❌ Errors:`);
    results.errors.forEach(error => {
      console.log(`   ${error.opdbId} (${error.name}): ${error.error}`);
    });
  }
  
  console.log('');
  console.log(`✨ Process completed!`);
  console.log(`💡 Next time, run the same command to continue from where you left off.`);
}

// Handle errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the script
main().catch(console.error); 