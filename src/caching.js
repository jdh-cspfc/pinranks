// src/caching.js

import logger from './utils/logger';

// In-memory cache
const memoryCache = {};

// Get data from cache or fetch if not present/stale
export async function getCachedData(key, fetchFn, maxAgeMs = 604800_000) {
  // 1. Check in-memory cache
  if (memoryCache[key] && Date.now() - memoryCache[key].timestamp < maxAgeMs) {
    logger.debug('cache', `Cache HIT (memory): ${key}`);
    return memoryCache[key].data;
  }

  // 2. Check localStorage
  const local = localStorage.getItem(key);
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Date.now() - parsed.timestamp < maxAgeMs) {
        logger.debug('cache', `Cache HIT (localStorage): ${key}`);
        // Update in-memory cache
        memoryCache[key] = parsed;
        return parsed.data;
      } else {
        logger.debug('cache', `Cache EXPIRED (localStorage): ${key}`);
      }
    } catch (error) {
      logger.warn('cache', `Cache ERROR (localStorage): ${key} - ${error.message}`);
    }
  } else {
    logger.debug('cache', `Cache MISS (localStorage): ${key}`);
  }

  // 3. Fetch from server
  logger.debug('cache', `Fetching from server: ${key}`);
  const data = await fetchFn();
  setCachedData(key, data);
  return data;
}

// Set data in both caches
export function setCachedData(key, data) {
  logger.debug('cache', `Caching data: ${key}`);
  const value = { data, timestamp: Date.now() };
  memoryCache[key] = value;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    logger.debug('cache', `Successfully cached to localStorage: ${key}`);
  } catch (error) {
    logger.warn('cache', `Failed to cache to localStorage: ${key} - ${error.message}`);
  }
}

// Clear data from both caches
export function clearCachedData(key) {
  logger.debug('cache', `Clearing cache: ${key}`);
  delete memoryCache[key];
  localStorage.removeItem(key);
  logger.debug('cache', `Cache cleared: ${key}`);
} 