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
        "User-Agent": "PinRanks-Image-Downloader/1.0",
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
    console.error(
        `Failed to download/store image ${imageUrl}:`,
        error.message,
    );
    return null;
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

    // Download each image type
    for (const [size, url] of Object.entries(imageUrls)) {
      if (url) {
        const fileName = `${opdbId}-${size}.jpg`;
        const result = await downloadAndStoreImage(url, fileName);
        if (result) {
          results[size] = result.url;
          actions[size] = result.action;
        }
      }
    }

    res.json({
      success: true,
      opdbId,
      images: results,
      actions: actions,
    });
  } catch (error) {
    console.error("Error in downloadMachineImages:", error);
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
    console.error("Error in getImageUrl:", error);
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
    console.error("Error in checkImageStatus:", error);
    res.status(500).json({error: "Internal server error"});
  }
});
