#!/usr/bin/env node

/**
 * Script to synchronize OPDB data to Firebase Storage
 * 
 * This script fetches machines and groups data from OPDB API and uploads
 * them to Firebase Storage as JSON files.
 * 
 * Usage:
 *   node scripts/syncOPDBData.js
 * 
 * Environment Variables:
 *   OPDB_API_TOKEN - OPDB API token for authentication (required)
 *   FIREBASE_STORAGE_BUCKET - Firebase Storage bucket name (optional, defaults to pinranks-efabb.firebasestorage.app)
 *   GOOGLE_APPLICATION_CREDENTIALS - Path to Firebase service account key JSON file (for local runs)
 *                                    In GitHub Actions, use FIREBASE_SERVICE_ACCOUNT_KEY secret
 */

import admin from 'firebase-admin';
import axios from 'axios';

// Simple logger
const logger = {
  error: (category, message, ...args) => {
    console.error(`[${category.toUpperCase()}] ${message}`, ...args);
  },
  warn: (category, message, ...args) => {
    console.warn(`[${category.toUpperCase()}] ${message}`, ...args);
  },
  info: (category, message, ...args) => {
    console.info(`[${category.toUpperCase()}] ${message}`, ...args);
  },
  debug: (category, message, ...args) => {
    console.log(`[${category.toUpperCase()}] ${message}`, ...args);
  },
};

// Initialize Firebase Admin
function initializeFirebase() {
  // Check if already initialized
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // For GitHub Actions, use service account key from environment variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'pinranks-efabb.firebasestorage.app',
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // For local development, use service account key file
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'pinranks-efabb.firebasestorage.app',
    });
  } else {
    // Try to use Application Default Credentials (for local development with gcloud auth)
    admin.initializeApp({
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'pinranks-efabb.firebasestorage.app',
    });
  }

  return admin.app();
}

const bucket = initializeFirebase().storage().bucket();

/**
 * Helper function to fetch from OPDB API with rate limit handling and retries
 * @param {string} url - The OPDB API URL to fetch
 * @param {string} apiToken - The OPDB API token for authentication
 * @param {number} retries - Number of retry attempts
 * @param {number} delay - Delay between retries in milliseconds
 * @return {Promise<Object>} The fetched JSON data
 */
async function fetchFromOPDB(url, apiToken, retries = 3, delay = 60000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.info(
          "opdb",
          `Fetching from ${url} (attempt ${attempt}/${retries})`);

      const response = await axios.get(url, {
        timeout: 120000, // 2 minute timeout
        params: {
          api_token: apiToken,
        },
        headers: {
          "User-Agent":
              "Mozilla/5.0 (compatible; PinRanks-OPDB-Fetcher/1.0; +https://pinranks.com)",
          "Accept": "application/json",
        },
        validateStatus: function(status) {
          return status >= 200 && status < 300;
        },
      });

      if (response.data) {
        logger.info("opdb", `Successfully fetched from ${url}`);
        return response.data;
      }

      throw new Error("Empty response data");
    } catch (error) {
      const isLastAttempt = attempt === retries;
      const errorDetails = {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: url,
        attempt: attempt,
        isLastAttempt: isLastAttempt,
      };

      // Check for authentication errors (401 status code)
      if (error.response?.status === 401) {
        logger.error(
            "opdb",
            `Authentication failed for ${url}. Check API token.`,
            errorDetails);
        throw new Error(
            "OPDB API authentication failed. Check API token.");
      }

      // Check for rate limit (429) or 403 (Forbidden)
      if (error.response?.status === 429 || error.response?.status === 403) {
        logger.warn(
            "opdb",
            `Rate limited on ${url}. Waiting 1 hour before retry.`,
            errorDetails);
        if (!isLastAttempt) {
          // Wait 1 hour (3600000 ms) for rate limit
          // Note: /api/export is specifically rate limited to once per hour
          await new Promise((resolve) => setTimeout(resolve, 3600000));
          continue;
        }
      }

      logger.error("opdb", `Failed to fetch from ${url}`, errorDetails);

      if (isLastAttempt) {
        throw new Error(
            `Failed to fetch from ${url} after ${retries} ` +
            `attempts: ${error.message}`);
      }

      // Exponential backoff for other errors
      const backoffDelay = delay * Math.pow(2, attempt - 1);
      logger.info("opdb", `Retrying in ${backoffDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }
}

/**
 * Helper function to upload JSON data to Firebase Storage
 * @param {Object} data - The JSON data to upload
 * @param {string} fileName - The filename in Storage
 * @return {Promise<void>}
 */
async function uploadJSONToStorage(data, fileName) {
  try {
    logger.info("storage", `Uploading ${fileName} to Firebase Storage`);

    const file = bucket.file(fileName);
    const jsonString = JSON.stringify(data);

    await file.save(jsonString, {
      metadata: {
        contentType: "application/json",
        cacheControl: "public, max-age=3600", // Cache for 1 hour
      },
    });

    // Make the file publicly readable
    await file.makePublic();

    logger.info(
        "storage",
        `Successfully uploaded ${fileName} to Firebase Storage`);
  } catch (error) {
    logger.error("storage", `Failed to upload ${fileName}: ${error.message}`, {
      error: error.message,
      code: error.code,
      fileName: fileName,
    });
    throw error;
  }
}

/**
 * Core function to synchronize OPDB data to Firebase Storage
 */
async function syncOPDBDataCore() {
  const startTime = Date.now();
  logger.info("opdb-sync", "Starting OPDB data synchronization");

  // Get API token from environment variable
  const apiToken = process.env.OPDB_API_TOKEN;
  if (!apiToken) {
    throw new Error(
        "OPDB API token not configured. Set OPDB_API_TOKEN environment variable.");
  }

  try {
    // Fetch machines and groups in parallel using export endpoints
    // Note: /api/export is rate limited to once per hour
    const [machinesData, groupsData] = await Promise.all([
      fetchFromOPDB("https://opdb.org/api/export", apiToken),
      fetchFromOPDB("https://opdb.org/api/export/groups", apiToken),
    ]);

    // Upload both files to Storage
    await Promise.all([
      uploadJSONToStorage(machinesData, "machines.json"),
      uploadJSONToStorage(groupsData, "groups.json"),
    ]);

    const duration = Date.now() - startTime;
    logger.info(
        "opdb-sync",
        `Successfully synchronized OPDB data in ${duration}ms`,
        {
          machinesCount:
              Array.isArray(machinesData) ? machinesData.length : "unknown",
          groupsCount:
              Array.isArray(groupsData) ? groupsData.length : "unknown",
          duration: duration,
        });

    return {
      success: true,
      machinesCount: Array.isArray(machinesData) ? machinesData.length : 0,
      groupsCount: Array.isArray(groupsData) ? groupsData.length : 0,
      duration: duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
        "opdb-sync",
        `Failed to synchronize OPDB data after ${duration}ms: ${error.message}`,
        {
          error: error.message,
          code: error.code,
          stack: error.stack,
          duration: duration,
        });
    throw error;
  }
}

// Run the sync
syncOPDBDataCore()
    .then((result) => {
      console.log("✅ Sync completed successfully:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Sync failed:", error.message);
      process.exit(1);
    });

