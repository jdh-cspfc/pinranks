// src/caching.js

// In-memory cache
const memoryCache = {};

// Get data from cache or fetch if not present/stale
export async function getCachedData(key, fetchFn, maxAgeMs = 604800_000) {
  // 1. Check in-memory cache
  if (memoryCache[key] && Date.now() - memoryCache[key].timestamp < maxAgeMs) {
    return memoryCache[key].data;
  }

  // 2. Check localStorage
  const local = localStorage.getItem(key);
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Date.now() - parsed.timestamp < maxAgeMs) {
        // Update in-memory cache
        memoryCache[key] = parsed;
        return parsed.data;
      }
    } catch {}
  }

  // 3. Fetch from server
  const data = await fetchFn();
  setCachedData(key, data);
  return data;
}

// Set data in both caches
export function setCachedData(key, data) {
  const value = { data, timestamp: Date.now() };
  memoryCache[key] = value;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// Clear data from both caches
export function clearCachedData(key) {
  delete memoryCache[key];
  localStorage.removeItem(key);
} 