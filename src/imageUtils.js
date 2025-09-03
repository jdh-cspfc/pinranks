// Image URL resolution utility
// This handles checking for locally stored images before falling back to OPDB URLs

import { FIREBASE_CONFIG, IMAGE_CONFIG } from './config.js';
import errorService from './services/errorService.js';

const FIREBASE_FUNCTIONS_URL = FIREBASE_CONFIG.functionsUrl;

// Cache for resolved image URLs to avoid repeated API calls
const imageUrlCache = new Map();

/**
 * Get the best available image URL for a machine
 * @param {Object} machine - The machine object from machines.json
 * @param {string} size - 'small', 'medium', or 'large'
 * @returns {Promise<string|null>} - The resolved image URL or null if not available
 */
export async function getImageUrl(machine, size = 'large') {
  if (!machine?.images) return null;
  
  const backglass = machine.images.find(img => img.type === 'backglass');
  if (!backglass?.urls) return null;
  
  // Create cache key
  const cacheKey = `${machine.opdb_id}-${size}`;
  
  // Check cache first
  if (imageUrlCache.has(cacheKey)) {
    return imageUrlCache.get(cacheKey);
  }
  
  try {
    // Try to get from our local storage first
    const localUrl = await getLocalImageUrl(machine.opdb_id, size);
    if (localUrl) {
      imageUrlCache.set(cacheKey, localUrl);
      return localUrl;
    }
    
    // OPDB fallback disabled for testing to avoid overusing their servers
    // Only return Firebase images during testing
    imageUrlCache.set(cacheKey, null);
    return null;
  } catch (error) {
    // Failed to resolve image URL - will use fallback
    // OPDB fallback disabled for testing
    imageUrlCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Get image URL from local Firebase Storage
 * @param {string} opdbId - The OPDB ID of the machine
 * @param {string} size - 'small', 'medium', or 'large'
 * @returns {Promise<string|null>} - The local image URL or null if not found
 */
async function getLocalImageUrl(opdbId, size) {
  try {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_URL}/getImageUrl?opdbId=${opdbId}&size=${size}`,
      { timeout: 5000 }
    );
    
    if (response.ok) {
      const data = await response.json();
      return data.url;
    }
    
    return null;
  } catch (error) {
    // Failed to get local image URL - will use fallback
    return null;
  }
}

/**
 * Download and store images for a machine
 * @param {Object} machine - The machine object from machines.json
 * @returns {Promise<Object>} - Object with success status and stored image URLs
 */
export async function downloadMachineImages(machine) {
  if (!machine?.images) {
    return { success: false, error: 'No images found' };
  }
  
  const backglass = machine.images.find(img => img.type === 'backglass');
  if (!backglass?.urls) {
    return { success: false, error: 'No backglass images found' };
  }
  
  try {
    const response = await fetch(`${FIREBASE_FUNCTIONS_URL}/downloadMachineImages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        opdbId: machine.opdb_id,
        imageUrls: backglass.urls
      }),
      timeout: 30000
    });
    
    if (response.ok) {
      const result = await response.json();
      
      // Update cache with new URLs
      if (result.images) {
        Object.entries(result.images).forEach(([size, url]) => {
          const cacheKey = `${machine.opdb_id}-${size}`;
          imageUrlCache.set(cacheKey, url);
        });
      }
      
      return result;
    } else {
      const error = await response.text();
      return { success: false, error };
    }
  } catch (error) {
    // Log error for debugging
    errorService.logError(error, {
      component: 'imageUtils',
      action: 'downloadMachineImages',
      metadata: { opdbId: machine.opdb_id, imageUrls: Object.keys(backglass.urls) }
    });
    
    return { success: false, error: error.message };
  }
}

/**
 * Preload images for a list of machines
 * @param {Array} machines - Array of machine objects
 * @param {string} size - Image size to preload
 * @returns {Promise<Array>} - Array of results for each machine
 */
export async function preloadImages(machines, size = 'large') {
  const results = [];
  
  for (const machine of machines) {
    try {
      const url = await getImageUrl(machine, size);
      if (url) {
        // Preload the image
        const img = new Image();
        img.src = url;
        results.push({ machine: machine.opdb_id, success: true, url });
      } else {
        results.push({ machine: machine.opdb_id, success: false, error: 'No image URL' });
      }
    } catch (error) {
      results.push({ machine: machine.opdb_id, success: false, error: error.message });
    }
  }
  
  return results;
}

/**
 * Clear the image URL cache
 */
export function clearImageCache() {
  imageUrlCache.clear();
}

/**
 * Check which images exist for a list of machines
 * @param {Array} machines - Array of machine objects
 * @returns {Promise<Object>} - Object with image status for each machine
 */
export async function checkImageStatus(machines) {
  try {
    const response = await fetch(`${FIREBASE_FUNCTIONS_URL}/checkImageStatus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ machines }),
      timeout: 30000
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.results;
    } else {
      // Failed to check image status - return empty object
      return {};
    }
  } catch (error) {
    // Log error for debugging
    errorService.logError(error, {
      component: 'imageUtils',
      action: 'checkImageStatus',
      metadata: { machineCount: machines?.length || 0 }
    });
    
    // Error checking image status - return empty object
    return {};
  }
} 