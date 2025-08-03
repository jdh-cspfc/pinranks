// Firebase configuration
export const FIREBASE_CONFIG = {
  // Update this with your actual Firebase project ID
  projectId: 'pinranks-efabb',
  
  // Firebase Functions region
  region: 'us-central1',
  
  // Firebase Functions base URL
  get functionsUrl() {
    return `https://${this.region}-${this.projectId}.cloudfunctions.net`;
  }
};

// Image configuration
export const IMAGE_CONFIG = {
  // Default image size to use
  defaultSize: 'large',
  
  // Cache duration for image URLs (in milliseconds)
  cacheDuration: 24 * 60 * 60 * 1000, // 24 hours
  
  // Timeout for image requests (in milliseconds)
  requestTimeout: 5000,
  
  // Delay between batch downloads (in milliseconds)
  batchDelay: 1000,
}; 