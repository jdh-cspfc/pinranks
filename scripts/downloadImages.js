#!/usr/bin/env node

/**
 * Script to batch download images from OPDB and store them in Firebase Storage
 * 
 * Usage:
 *   node scripts/downloadImages.js [--limit=100] [--priority=modern]
 * 
 * Options:
 *   --limit    Number of machines with actual downloads (default: 100)
 *              Note: Machines where images already exist are skipped and don't count toward limit
 *   --priority 'all', 'em', 'reels', 'alphanumeric', 'dmd', or 'modern'
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
  priority: 'all' // 'all', 'em', 'reels', 'alphanumeric', 'dmd', 'modern'
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

const STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'pinranks-efabb.firebasestorage.app';
const MACHINES_FILE = process.env.MACHINES_JSON_PATH || 'machines.json';
const MACHINES_JSON_URL = process.env.MACHINES_JSON_URL ||
  `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(MACHINES_FILE)}?alt=media`;
const LOCAL_MACHINES_PATH = path.join(__dirname, '../public/machines.json');

function normalizeMachinesData(rawData) {
  if (Array.isArray(rawData)) {
    return rawData;
  }

  if (rawData && Array.isArray(rawData.machines)) {
    return rawData.machines;
  }

  throw new Error('Unexpected machines.json format');
}

async function loadMachines() {
  try {
    console.log(`📡 Fetching machines from Firebase Storage: ${MACHINES_JSON_URL}`);
    const response = await axios.get(MACHINES_JSON_URL, { timeout: 30000 });
    const machines = normalizeMachinesData(response.data);
    console.log(`✅ Loaded ${machines.length} machines from Firebase Storage`);
    return machines;
  } catch (error) {
    if (fs.existsSync(LOCAL_MACHINES_PATH)) {
      console.log(`⚠️  Falling back to local machines.json due to: ${error.message}`);
      return normalizeMachinesData(JSON.parse(fs.readFileSync(LOCAL_MACHINES_PATH, 'utf8')));
    }
    throw new Error(`Failed to load machines.json from Firebase Storage and no local fallback available: ${error.message}`);
  }
}

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

function saveProgress(processed, lastMachine, downloads = null) {
  try {
    const progressData = { processed, lastMachine };
    if (downloads !== null) {
      progressData.downloads = downloads;
    }
    fs.writeFileSync(progressFile, JSON.stringify(progressData, null, 2));
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
      const errors = response.data.errors || {};
      const downloaded = Object.values(actions).filter(a => a === 'downloaded').length;
      const skipped = Object.values(actions).filter(a => a === 'skipped').length;
      const failed = Object.values(actions).filter(a => a === 'failed').length;

      if (downloaded > 0) {
        console.log(`✅ Downloaded ${downloaded} new images for ${machine.opdb_id}`);
      }
      if (skipped > 0) {
        console.log(`⏭️  Skipped ${skipped} existing images for ${machine.opdb_id}`);
      }
      if (failed > 0) {
        console.log(`❌ Failed to download ${failed} images for ${machine.opdb_id}`);
        // Log detailed error information
        Object.entries(errors).forEach(([size, errorInfo]) => {
          const statusCode = errorInfo.statusCode || 'unknown';
          const errorMsg = errorInfo.error || 'Unknown error';
          console.log(`   ${size}: ${errorMsg} (HTTP ${statusCode})`);
          if (errorInfo.url) {
            console.log(`   URL: ${errorInfo.url}`);
          }
        });
      }
      
      if (downloaded === 0 && skipped === 0 && failed === 0) {
        console.log(`⚠️  No images processed for ${machine.opdb_id} (no actions returned)`);
      }
      
      return { ...response.data, downloaded, skipped, failed };
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
import { filterMachinesByPriority } from '../src/utils/filterUtils.js';

// Map priority options to their corresponding filter groups
const PRIORITY_TO_FILTER_MAP = {
  'alphanumeric': 'Solid State',
  'reels': 'EM',
  'em': 'EM',
  'dmd': 'DMD',
  'modern': 'Modern',
  'all': 'all'
};

async function main() {
  console.log(`🚀 Starting image download process...`);

  const machines = await loadMachines();

  console.log(`   Total machines: ${machines.length}`);
  console.log(`   Limit: ${options.limit} machines with actual downloads`);
  console.log(`   Priority: ${options.priority}`);
  console.log(`   Dry run: ${options.dryRun}`);
  console.log('');
  
  // Load progress
  const progress = loadProgress();
  console.log(`📊 Progress: ${progress.processed} machines processed so far`);
  console.log(`📊 Downloads: ${progress.downloads || 0} machines with actual downloads`);
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
  const startIndex = progress.processed || 0;
  const downloadsSoFar = progress.downloads || 0;
  
  console.log(`📊 Processing:`);
  console.log(`   Total ${options.priority} machines: ${filteredMachines.length}`);
  console.log(`   Starting from index: ${startIndex}`);
  console.log(`   Target: ${options.limit} machines with actual downloads`);
  console.log(`   Already downloaded: ${downloadsSoFar}/${options.limit}`);
  console.log('');
  
  if (startIndex >= filteredMachines.length) {
    console.log(`✅ All ${options.priority} machines have been processed!`);
    return;
  }
  
  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    downloaded: 0,
    skipped: 0,
    imageFailures: 0,
    errors: [],
    machinesWithDownloads: 0
  };
  
  let currentIndex = startIndex;
  let downloadsCount = downloadsSoFar;
  
  // Process machines until we reach the download limit or run out of machines
  while (downloadsCount < options.limit && currentIndex < filteredMachines.length) {
    const machine = filteredMachines[currentIndex];
    const result = await downloadMachineImages(machine);
    
    results.total++;
    
    if (result.success) {
      results.successful++;
      results.downloaded += result.downloaded || 0;
      results.skipped += result.skipped || 0;
      results.imageFailures += result.failed || 0;
      
      // Only count as a "download" if we actually downloaded new images
      if ((result.downloaded || 0) > 0) {
        downloadsCount++;
        results.machinesWithDownloads++;
      }
    } else {
      results.failed++;
      results.errors.push({
        opdbId: machine.opdb_id,
        name: machine.name,
        error: result.error
      });
    }
    
    // Save progress after each machine (including both processed count and download count)
    saveProgress(currentIndex + 1, machine.opdb_id, downloadsCount);
    
    currentIndex++;
    
    // Add a small delay to be respectful to the servers
    if (!options.dryRun && currentIndex < filteredMachines.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('');
  console.log(`📊 Download Summary:`);
  console.log(`   Total processed: ${results.total}`);
  console.log(`   Machines with actual downloads: ${results.machinesWithDownloads}`);
  console.log(`   Successful: ${results.successful}`);
  console.log(`   Failed machines: ${results.failed}`);
  console.log(`   New images downloaded: ${results.downloaded}`);
  console.log(`   Images skipped (already existed): ${results.skipped}`);
  console.log(`   Image download failures: ${results.imageFailures}`);
  console.log(`   Progress saved: ${currentIndex}/${filteredMachines.length} ${options.priority} machines processed`);
  console.log(`   Download target: ${downloadsCount}/${options.limit} machines with downloads`);
  
  if (results.errors.length > 0) {
    console.log('');
    console.log(`❌ Errors:`);
    results.errors.forEach(error => {
      console.log(`   ${error.opdbId} (${error.name}): ${error.error}`);
    });
  }
  
  console.log('');
  if (downloadsCount >= options.limit) {
    console.log(`✅ Reached download limit of ${options.limit} machines with actual downloads!`);
  } else if (currentIndex >= filteredMachines.length) {
    console.log(`✅ All ${options.priority} machines have been processed!`);
  } else {
    console.log(`✨ Process completed!`);
  }
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