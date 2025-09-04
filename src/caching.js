// src/caching.js

// In-memory cache
const memoryCache = {};

// Get data from cache or fetch if not present/stale
export async function getCachedData(key, fetchFn, maxAgeMs = 604800_000) {
  // 1. Check in-memory cache
  if (memoryCache[key] && Date.now() - memoryCache[key].timestamp < maxAgeMs) {
    console.log(`💾 Cache HIT (memory): ${key}`);
    return memoryCache[key].data;
  }

  // 2. Check localStorage
  const local = localStorage.getItem(key);
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Date.now() - parsed.timestamp < maxAgeMs) {
        console.log(`💾 Cache HIT (localStorage): ${key}`);
        // Update in-memory cache
        memoryCache[key] = parsed;
        return parsed.data;
      } else {
        console.log(`💾 Cache EXPIRED (localStorage): ${key}`);
      }
    } catch (error) {
      console.log(`💾 Cache ERROR (localStorage): ${key} - ${error.message}`);
    }
  } else {
    console.log(`💾 Cache MISS (localStorage): ${key}`);
  }

  // 3. Fetch from server
  console.log(`🌐 Fetching from server: ${key}`);
  const data = await fetchFn();
  setCachedData(key, data);
  return data;
}

// Set data in both caches
export function setCachedData(key, data) {
  console.log(`💾 Caching data: ${key}`);
  const value = { data, timestamp: Date.now() };
  memoryCache[key] = value;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    console.log(`✅ Successfully cached to localStorage: ${key}`);
  } catch (error) {
    console.log(`❌ Failed to cache to localStorage: ${key} - ${error.message}`);
  }
}

// Clear data from both caches
export function clearCachedData(key) {
  console.log(`🗑️ Clearing cache: ${key}`);
  delete memoryCache[key];
  localStorage.removeItem(key);
  console.log(`✅ Cache cleared: ${key}`);
} 