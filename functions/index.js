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
  }
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
      validateStatus: function (status) {
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
    logger.error('firebase', `Failed to download/store image: ${JSON.stringify(errorDetails)}`);
    return {action: "failed", error: error.message, statusCode: error.response?.status, url: imageUrl};
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
          // This shouldn't happen anymore with the updated error handling, but just in case
          actions[size] = "failed";
          errors[size] = {error: "Unknown error", url: url};
        }
      }
    }

    // Determine overall success based on whether any images succeeded
    const hasSuccess = Object.values(actions).some(a => a === "downloaded" || a === "skipped");

    res.json({
      success: hasSuccess, // Success if at least one image was downloaded or skipped
      opdbId,
      images: results,
      actions: actions,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    });
  } catch (error) {
    logger.error('firebase', `Error in downloadMachineImages: ${error.message}`);
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
    logger.error('firebase', `Error in getImageUrl: ${error.message}`);
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
    logger.error('firebase', `Error in checkImageStatus: ${error.message}`);
    res.status(500).json({error: "Internal server error"});
  }
});
