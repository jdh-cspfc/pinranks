/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */


const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const sharp = require("sharp");

// Simple logger for Firebase Functions
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

admin.initializeApp();

const bucket = admin.storage().bucket();

/**
 * Download and store a single image
 * @param {string} imageUrl - The URL of the image to download
 * @param {string} fileName - The filename to save the image as
 * @return {Promise<string|null>} The signed URL of the stored image or null if
 *     failed
 */
async function downloadAndStoreImage(imageUrl, fileName) {
  try {
    // Check if image already exists
    const file = bucket.file(`images/${fileName}`);
    const [exists] = await file.exists();

    if (exists) {
      // Try to get signed URL first
      try {
        const [url] = await file.getSignedUrl({
          action: "read",
          expires: "03-01-2500",
        });
        return {url, action: "skipped"};
      } catch (error) {
        // Fallback to OPDB URL if we can't get signed URL
        return {url: null, action: "skipped"};
      }
    }

    // Downloading image

    // Download the image
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 30000, // 30 second timeout
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PinRanks-Image-Downloader/1.0; +https://pinranks.com)",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://opdb.org/",
      },
      validateStatus: function(status) {
        return status >= 200 && status < 300; // default
      },
    });

    // Optimize the image with sharp
    const optimizedImageBuffer = await sharp(response.data)
        .jpeg({quality: 85, progressive: true})
        .toBuffer();

    // Upload to Firebase Storage
    await file.save(optimizedImageBuffer, {
      metadata: {
        contentType: "image/jpeg",
        cacheControl: "public, max-age=31536000", // Cache for 1 year
      },
    });

    // Try to get signed URL
    try {
      const [url] = await file.getSignedUrl({
        action: "read",
        expires: "03-01-2500",
      });
      return {url, action: "downloaded"};
    } catch (error) {
      // Fallback to OPDB URL if we can't get signed URL
      return {url: null, action: "downloaded"};
    }
  } catch (error) {
    // Enhanced error logging
    const errorDetails = {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: imageUrl,
      fileName: fileName,
    };
    logger.error(
        "firebase",
        `Failed to download/store image: ${JSON.stringify(errorDetails)}`);
    return {
      action: "failed",
      error: error.message,
      statusCode: error.response?.status,
      url: imageUrl,
    };
  }
}

// HTTP function to download images for a specific machine
exports.downloadMachineImages = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const {opdbId, imageUrls} = req.body;

    if (!opdbId || !imageUrls) {
      res.status(400).json({error: "Missing opdbId or imageUrls"});
      return;
    }

    const results = {};
    const actions = {};
    const errors = {};

    // Download each image type
    for (const [size, url] of Object.entries(imageUrls)) {
      if (url) {
        const fileName = `${opdbId}-${size}.jpg`;
        const result = await downloadAndStoreImage(url, fileName);
        if (result) {
          if (result.action === "failed") {
            actions[size] = "failed";
            errors[size] = {
              error: result.error,
              statusCode: result.statusCode,
              url: result.url,
            };
          } else {
            results[size] = result.url;
            actions[size] = result.action;
          }
        } else {
          // This shouldn't happen anymore with the updated error handling,
          // but just in case
          actions[size] = "failed";
          errors[size] = {error: "Unknown error", url: url};
        }
      }
    }

    // Determine overall success based on whether any images succeeded
    const hasSuccess = Object.values(actions).some(
        (a) => a === "downloaded" || a === "skipped");

    res.json({
      // Success if at least one image was downloaded or skipped
      success: hasSuccess,
      opdbId,
      images: results,
      actions: actions,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error(
        "firebase",
        `Error in downloadMachineImages: ${error.message}`);
    res.status(500).json({error: "Internal server error"});
  }
});

// Scheduled function to batch download images (runs daily)
// Note: This is commented out for now as it requires additional setup
// exports.batchDownloadImages = functions.pubsub
//     .schedule("every 24 hours")
//     .onRun(async (context) => {
//   try {
//     console.log("🚀 Starting batch image download...");
//     console.log("✅ Batch download completed");
//     return null;
//   } catch (error) {
//     console.error("❌ Error in batch download:", error);
//     return null;
//   }
// });

// Function to get image URL (serves as a proxy/cache)
exports.getImageUrl = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");

  try {
    const {opdbId, size = "large"} = req.query;

    if (!opdbId) {
      res.status(400).json({error: "Missing opdbId"});
      return;
    }

    const fileName = `${opdbId}-${size}.jpg`;
    const file = bucket.file(`images/${fileName}`);

    // Check if file exists
    const [exists] = await file.exists();

    if (exists) {
      // Try to get signed URL
      try {
        const [url] = await file.getSignedUrl({
          action: "read",
          expires: "03-01-2500",
        });
        res.json({url});
      } catch (error) {
        // Could not get signed URL
        res.status(500).json({error: "Failed to generate image URL"});
      }
    } else {
      res.status(404).json({error: "Image not found"});
    }
  } catch (error) {
    logger.error("firebase", `Error in getImageUrl: ${error.message}`);
    res.status(500).json({error: "Internal server error"});
  }
});

// Function to check which images exist for a list of machines
exports.checkImageStatus = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const {machines} = req.body;

    if (!machines || !Array.isArray(machines)) {
      res.status(400).json({error: "Missing or invalid machines array"});
      return;
    }

    const results = {};

    for (const machine of machines) {
      const opdbId = machine.opdb_id;
      const backglass = machine.images &&
          machine.images.find((img) => img.type === "backglass");

      if (!backglass || !backglass.urls) {
        results[opdbId] = {exists: false, reason: "No backglass images"};
        continue;
      }

      const status = {};
      for (const [size, url] of Object.entries(backglass.urls)) {
        if (url) {
          const fileName = `${opdbId}-${size}.jpg`;
          const file = bucket.file(`images/${fileName}`);
          const [exists] = await file.exists();
          status[size] = {exists, url};
        }
      }

      results[opdbId] = status;
    }

    res.json({results});
  } catch (error) {
    logger.error("firebase", `Error in checkImageStatus: ${error.message}`);
    res.status(500).json({error: "Internal server error"});
  }
});

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
 * This is the shared logic used by both scheduled and manual triggers
 */
async function syncOPDBDataCore() {
  const startTime = Date.now();
  logger.info("opdb-sync", "Starting OPDB data synchronization");

  // Get API token from environment variable
  // For v2 functions, use environment variables instead of functions.config()
  const apiToken = process.env.OPDB_API_TOKEN;
  if (!apiToken) {
    throw new Error(
        "OPDB API token not configured. Set it with: " +
        "firebase functions:secrets:set OPDB_API_TOKEN");
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

/**
 * Scheduled function to fetch OPDB data and upload to Firebase Storage
 * Runs daily at 3 AM UTC (low traffic time)
 */
exports.syncOPDBData = functions.scheduler.onSchedule({
  schedule: "0 3 * * *",
  timeZone: "UTC",
  secrets: ["OPDB_API_TOKEN"],
}, async (event) => {
  try {
    await syncOPDBDataCore();
    return null;
  } catch (error) {
    // Don't throw - allow the function to complete and log the error
    logger.error("opdb-sync", `Scheduled sync failed: ${error.message}`);
    return null;
  }
});

/**
 * HTTP function to manually trigger OPDB data synchronization
 * Useful for testing or initial setup
 */
exports.manualSyncOPDBData = functions.https.onRequest({
  secrets: ["OPDB_API_TOKEN"],
}, async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const result = await syncOPDBDataCore();
    res.json({
      success: true,
      message: "OPDB data synchronized successfully",
      ...result,
    });
  } catch (error) {
    logger.error("opdb-sync", `Manual sync failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to synchronize OPDB data",
    });
  }
});
