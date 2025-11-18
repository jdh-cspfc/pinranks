# GitHub Secrets Setup Guide

This guide will help you set up the required GitHub secrets for the OPDB data sync workflow.

## Required Secrets

You need to set up these secrets in your GitHub repository:

1. **OPDB_API_TOKEN** - Your OPDB API token
2. **FIREBASE_SERVICE_ACCOUNT_KEY** - Firebase service account JSON (as a string)
3. **FIREBASE_STORAGE_BUCKET** - (Optional) Storage bucket name

## Step-by-Step Instructions

### Step 1: Access GitHub Secrets

1. Go to your repository on GitHub: `https://github.com/YOUR_USERNAME/pinranks`
2. Click **Settings** (top menu)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**

### Step 2: Add OPDB_API_TOKEN

1. **Name**: `OPDB_API_TOKEN`
2. **Secret**: `pkpNe8sgDrgqXJcIf348cHi0xA1cAMBCi0w5spsj6LrQJBbah8ebgXEL0muP`
3. Click **Add secret**

### Step 3: Create Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **pinranks-efabb**
3. Click the **⚙️ gear icon** → **Project settings**
4. Go to the **Service accounts** tab
5. Click **Generate new private key**
6. Click **Generate key** in the confirmation dialog
7. A JSON file will download - **keep this file secure!**

### Step 4: Add FIREBASE_SERVICE_ACCOUNT_KEY

1. Open the downloaded JSON file
2. Copy the **entire contents** of the JSON file
3. Go back to GitHub Secrets
4. Click **New repository secret**
5. **Name**: `FIREBASE_SERVICE_ACCOUNT_KEY`
6. **Secret**: Paste the entire JSON content (it should look like `{"type":"service_account","project_id":"pinranks-efabb",...}`)
7. Click **Add secret**

### Step 5: (Optional) Add FIREBASE_STORAGE_BUCKET

If you want to override the default bucket name:

1. Click **New repository secret**
2. **Name**: `FIREBASE_STORAGE_BUCKET`
3. **Secret**: `pinranks-efabb.firebasestorage.app` (or your custom bucket name)
4. Click **Add secret**

**Note**: This is optional - the workflow will use `pinranks-efabb.firebasestorage.app` by default if not set.

## Verify Setup

After setting up the secrets, you can test the workflow:

1. Go to **Actions** tab in your GitHub repository
2. Find **Sync OPDB Data** workflow
3. Click **Run workflow** → **Run workflow** (manual trigger)
4. Check the logs to ensure it runs successfully

## Security Notes

- ⚠️ **Never commit** the service account key JSON file to your repository
- ⚠️ **Never share** your OPDB API token publicly
- ✅ The service account key in GitHub Secrets is encrypted and only accessible to workflows
- ✅ If you suspect a key is compromised, regenerate it in Firebase Console and update the secret

## Troubleshooting

### "OPDB API token not configured"
- Make sure `OPDB_API_TOKEN` secret is set correctly
- Check for typos in the secret name

### "Failed to initialize Firebase"
- Verify `FIREBASE_SERVICE_ACCOUNT_KEY` contains the complete JSON
- Make sure the JSON is valid (no extra characters, proper formatting)
- Ensure the service account has Storage Admin permissions

### "Permission denied" errors
- Check that the service account has the **Storage Admin** role in Firebase
- Go to Firebase Console → Project Settings → Service Accounts
- Verify the service account email has proper IAM permissions

