#!/usr/bin/env node

/**
 * Script to check which images are already downloaded
 * 
 * Usage:
 *   node scripts/checkImages.js [--limit=100] [--start=0]
 * 
 * Options:
 *   --limit    Number of machines to check (default: 100)
 *   --start    Starting index in machines array (default: 0)
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  limit: 100,
  start: 0,
  priority: 'all' // 'all', 'lcd', 'dmd', 'modern' (lcd+dmd)
};

args.forEach(arg => {
  if (arg.startsWith('--limit=')) {
    options.limit = parseInt(arg.split('=')[1]);
  } else if (arg.startsWith('--start=')) {
    options.start = parseInt(arg.split('=')[1]);
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

function analyzeStatus(status, machine) {
  const backglass = machine.images?.find(img => img.type === 'backglass');
  if (!backglass?.urls) {
    return { hasImages: false, reason: 'No backglass images' };
  }
  
  const sizes = Object.keys(backglass.urls);
  const existingSizes = [];
  const missingSizes = [];
  
  for (const [size, url] of Object.entries(backglass.urls)) {
    if (url) {
      if (status[size]?.exists) {
        existingSizes.push(size);
      } else {
        missingSizes.push(size);
      }
    }
  }
  
  return {
    hasImages: existingSizes.length > 0,
    complete: missingSizes.length === 0,
    existingSizes,
    missingSizes,
    totalSizes: sizes.length
  };
}

function getFilterGroup(display) {
  if (display === 'reels' || display === 'lights') return 'EM';
  if (display === 'alphanumeric') return 'Solid State';
  if (display === 'dmd') return 'DMD';
  if (display === 'lcd') return 'LCD';
  return null;
}

function filterMachinesByPriority(machines, priority) {
  if (priority === 'all') return machines;
  
  return machines.filter(machine => {
    const group = getFilterGroup(machine.display);
    if (priority === 'modern') {
      return group === 'LCD' || group === 'DMD';
    }
    return group === priority.toUpperCase();
  });
}

async function main() {
  console.log(`🔍 Image Status Check`);
  console.log(`====================\n`);
  console.log(`   Total machines: ${machines.length}`);
  console.log(`   Starting from index: ${options.start}`);
  console.log(`   Limit: ${options.limit}`);
  console.log(`   Priority: ${options.priority}`);
  console.log('');
  
  // Filter machines by priority first
  const filteredMachines = filterMachinesByPriority(machines, options.priority);
  console.log(`📊 Priority filtering:`);
  console.log(`   Total machines: ${machines.length}`);
  console.log(`   After ${options.priority} filter: ${filteredMachines.length}`);
  console.log('');
  
  const machinesToCheck = filteredMachines.slice(options.start, options.start + options.limit);
  
  // Check image status
  const status = await checkImageStatus(machinesToCheck);
  
  // Analyze results
  const analysis = {
    total: machinesToCheck.length,
    withImages: 0,
    complete: 0,
    partial: 0,
    noImages: 0,
    details: []
  };
  
  for (const machine of machinesToCheck) {
    const machineStatus = status[machine.opdb_id];
    const result = analyzeStatus(machineStatus, machine);
    
    analysis.details.push({
      opdbId: machine.opdb_id,
      name: machine.name,
      ...result
    });
    
    if (result.hasImages) {
      analysis.withImages++;
      if (result.complete) {
        analysis.complete++;
      } else {
        analysis.partial++;
      }
    } else {
      analysis.noImages++;
    }
  }
  
  // Print summary
  console.log(`📊 Summary:`);
  console.log(`   Total checked: ${analysis.total}`);
  console.log(`   With images: ${analysis.withImages} (${((analysis.withImages / analysis.total) * 100).toFixed(1)}%)`);
  console.log(`   Complete: ${analysis.complete} (${((analysis.complete / analysis.total) * 100).toFixed(1)}%)`);
  console.log(`   Partial: ${analysis.partial} (${((analysis.partial / analysis.total) * 100).toFixed(1)}%)`);
  console.log(`   No images: ${analysis.noImages} (${((analysis.noImages / analysis.total) * 100).toFixed(1)}%)`);
  console.log('');
  
  // Show details for machines missing images
  const missingImages = analysis.details.filter(d => !d.hasImages || !d.complete);
  
  if (missingImages.length > 0) {
    console.log(`📋 Machines needing images (${missingImages.length}):`);
    missingImages.forEach(detail => {
      if (!detail.hasImages) {
        console.log(`   ❌ ${detail.opdbId} (${detail.name}) - ${detail.reason || 'No images'}`);
      } else {
        console.log(`   ⚠️  ${detail.opdbId} (${detail.name}) - Missing: ${detail.missingSizes.join(', ')}`);
      }
    });
    console.log('');
  }
  
  // Show complete machines
  const complete = analysis.details.filter(d => d.complete);
  if (complete.length > 0) {
    console.log(`✅ Complete machines (${complete.length}):`);
    complete.slice(0, 10).forEach(detail => {
      console.log(`   ✅ ${detail.opdbId} (${detail.name})`);
    });
    if (complete.length > 10) {
      console.log(`   ... and ${complete.length - 10} more`);
    }
    console.log('');
  }
  
  console.log(`✨ Status check completed!`);
  
  // Suggest next steps
  if (missingImages.length > 0) {
    console.log(`\n💡 Next steps:`);
    console.log(`   To download missing images:`);
    console.log(`   npm run download-images -- --start=${options.start} --limit=${options.limit}`);
  }
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