# Image Hosting Setup Guide

This guide will help you set up local image hosting to avoid hammering the OPDB servers.

## Overview

The solution consists of:
1. **Firebase Cloud Functions** - Download and store images from OPDB
2. **Firebase Cloud Storage** - Host the downloaded images
3. **Frontend utilities** - Resolve image URLs with local fallback
4. **Batch download script** - Pre-download images in batches

## Prerequisites

- Firebase project with Cloud Functions and Cloud Storage enabled
- Node.js and npm installed
- Firebase CLI installed (`npm install -g firebase-tools`)

## Setup Steps

### 1. Update Firebase Project ID

Replace `YOUR_PROJECT_ID` with your actual Firebase project ID in these files:

- `src/imageUtils.js` (line 4)
- `scripts/downloadImages.js` (line 35)

### 2. Install Dependencies

```bash
# Install Firebase Functions dependencies
cd functions
npm install

# Install script dependencies (in project root)
npm install axios
```

### 3. Deploy Firebase Functions

```bash
# Deploy the Cloud Functions
firebase deploy --only functions
```

### 4. Configure Firebase Storage Rules

Update your Firebase Storage rules to allow public read access to images:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /images/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

Deploy the rules:
```bash
firebase deploy --only storage
```

### 5. Test the Setup

First, test with a dry run:
```bash
node scripts/downloadImages.js --limit=5 --dry-run
```

Then download a small batch:
```bash
node scripts/downloadImages.js --limit=10
```

## Usage

### Frontend Integration

The frontend automatically uses the new image system. The `getImageUrl()` function will:

1. Check if the image exists in your Firebase Storage
2. If found, return the local URL
3. If not found, fall back to the OPDB URL

### Checking Image Status

Before downloading, check which images already exist:

```bash
# Check first 100 machines
npm run check-images -- --limit=100

# Check machines 100-200
npm run check-images -- --start=100 --limit=100
```

### Batch Downloading Images

Use the download script to pre-download images (automatically skips existing images):

```bash
# Download first 100 images (skips existing ones)
npm run download-images -- --limit=100

# Download images 100-200 (skips existing ones)
npm run download-images -- --start=100 --limit=100

# Test what would be downloaded (dry run)
npm run download-images:dry-run -- --limit=50
```

### Manual Image Download

You can also trigger image downloads from the frontend:

```javascript
import { downloadMachineImages } from './imageUtils.js';

// Download images for a specific machine
const result = await downloadMachineImages(machine);
if (result.success) {
  console.log('Images downloaded:', result.images);
}
```

## Firebase Functions

The following functions are deployed:

### `downloadMachineImages`
- **URL**: `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/downloadMachineImages`
- **Method**: POST
- **Body**: `{ opdbId: string, imageUrls: object }`
- **Purpose**: Download and store images for a specific machine

### `getImageUrl`
- **URL**: `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/getImageUrl`
- **Method**: GET
- **Query**: `opdbId=string&size=string`
- **Purpose**: Get signed URL for a stored image

### `checkImageStatus`
- **URL**: `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/checkImageStatus`
- **Method**: POST
- **Body**: `{ machines: Array }`
- **Purpose**: Check which images exist for a list of machines

### `batchDownloadImages`
- **Trigger**: Scheduled (every 24 hours)
- **Purpose**: Automatically download new images

## Cost Considerations

### Firebase Storage
- Storage costs: ~$0.02/GB/month
- Download costs: ~$0.12/GB
- Estimated cost for 10,000 images (2MB each): ~$2.40/month

### Firebase Functions
- Invocations: 2M free per month
- Compute time: 400,000 GB-seconds free per month
- Estimated cost for 10,000 images: ~$0.50/month

### Total Estimated Cost
- **10,000 images**: ~$3/month
- **50,000 images**: ~$15/month

## Monitoring

### Check Storage Usage
```bash
firebase storage:list
```

### View Function Logs
```bash
firebase functions:log
```

### Monitor Costs
Visit the Firebase Console > Usage and billing

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure your Firebase project allows your domain
2. **Storage Permission Denied**: Check Firebase Storage rules
3. **Function Timeout**: Images are large, increase timeout in function config
4. **Rate Limiting**: The script includes delays, but you may need to adjust

### Debug Mode

Enable debug logging in `imageUtils.js`:
```javascript
const DEBUG = true;
```

### Manual Image Check

Check if an image exists:
```bash
curl "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/getImageUrl?opdbId=MACHINE_ID&size=large"
```

## Performance Optimization

### Image Optimization
- Images are automatically optimized with Sharp (85% JPEG quality)
- Progressive JPEG encoding for faster loading
- 1-year cache headers

### Deduplication
- **Automatic skipping**: Images are never downloaded twice
- **Status checking**: Check which images exist before downloading
- **Efficient processing**: Only download missing images
- **Storage optimization**: No duplicate files in Firebase Storage

### Caching Strategy
- Frontend caches resolved URLs in memory
- Firebase Storage serves with long cache headers
- Fallback to OPDB ensures availability

### Batch Processing
- Process images in small batches (100-200 at a time)
- Include delays between requests (1 second)
- Use dry-run mode to test before downloading
- Check status before downloading to avoid unnecessary work

## Security Considerations

- Images are publicly readable (required for your use case)
- Only authenticated users can upload images
- Signed URLs expire in 2030 (effectively permanent)
- Rate limiting prevents abuse

## Future Enhancements

1. **WebP Support**: Convert images to WebP for better compression
2. **CDN Integration**: Use Firebase Hosting CDN for faster delivery
3. **Image Resizing**: Generate multiple sizes on-demand
4. **Background Processing**: Use Cloud Tasks for large batch operations
5. **Analytics**: Track image usage and optimize storage 