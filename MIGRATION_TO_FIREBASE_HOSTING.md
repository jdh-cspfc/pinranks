# Migration Guide: GitHub Pages → Firebase Hosting

This guide will help you migrate your site from GitHub Pages to Firebase Hosting so that Google Auth shows "continue to pinranks.com" instead of the Firebase domain.

## Prerequisites

- Firebase CLI installed (`npm install -g firebase-tools`)
- Logged into Firebase (`firebase login`)
- Access to Firebase project: `pinranks-efabb`
- Access to Namecheap DNS settings

## Step 1: Initial Deployment to Firebase Hosting

1. **Build your site:**
   ```bash
   npm run build
   ```

2. **Deploy to Firebase Hosting:**
   ```bash
   npm run deploy:firebase
   ```
   
   Or use the full command:
   ```bash
   firebase deploy --only hosting
   ```

3. **Verify deployment:**
   - Your site should now be live at: `https://pinranks-efabb.web.app`
   - Test that everything works correctly

## Step 2: Add Custom Domain in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **pinranks-efabb**
3. Go to **Hosting** in the left sidebar
4. Click **Add custom domain**
5. Enter: `pinranks.com`
6. Click **Continue**

### Step 2a: Add www.pinranks.com (Optional but Recommended)

You have two options for handling `www.pinranks.com`:

**Option A: Add www as separate domain (both work independently)**
1. In Firebase Console → Hosting, click **Add custom domain** again
2. Enter: `www.pinranks.com`
3. Follow the DNS setup (usually a CNAME record)
4. Both `pinranks.com` and `www.pinranks.com` will work independently

**Option B: Redirect www to non-www (Recommended for SEO)**
1. Add `www.pinranks.com` as a custom domain (same as Option A)
2. After it's connected, Firebase will allow you to set up redirects
3. Configure redirect from `www.pinranks.com` → `pinranks.com` in Firebase Console
4. This ensures all traffic goes to one canonical domain

## Step 3: Configure DNS in Namecheap

Firebase will provide you with DNS records to add. You'll need to:

1. **Log into Namecheap:**
   - Go to https://www.namecheap.com
   - Navigate to **Domain List** → **Manage** for `pinranks.com`
   - Go to **Advanced DNS** tab

2. **Remove/Update existing GitHub Pages records:**
   - Remove any A records pointing to GitHub Pages IPs
   - Remove any CNAME records pointing to GitHub Pages

3. **Add Firebase Hosting records:**
   - For `pinranks.com`: Firebase will show you A records with IP addresses
   - Add the A records provided by Firebase
   - For `www.pinranks.com` (if you added it): Firebase will provide a CNAME record
   - **Important for Namecheap:** When adding the CNAME record:
     - **Host:** Enter only `www` (NOT `www.pinranks.com` - Namecheap automatically appends the domain)
     - **Value/Target:** Enter `pinranks-efabb.web.app` (without trailing dot, or with trailing dot - both work)
     - **Type:** CNAME Record

4. **Wait for DNS propagation:**
   - DNS changes can take 24-48 hours, but usually propagate within a few hours
   - You can check propagation status in Firebase Console

## Step 4: Verify Domain in Firebase

1. In Firebase Console → Hosting, check the status of your custom domain
2. Wait for it to show as **Connected** (green checkmark)
3. SSL certificate will be automatically provisioned (may take a few minutes)

## Step 5: Add Domain to Authorized Domains

1. Go to Firebase Console → **Authentication** → **Settings**
2. Scroll to **Authorized domains**
3. Click **Add domain**
4. Add: `pinranks.com`
5. **If you added `www.pinranks.com` as a separate domain (not redirecting):** Add `www.pinranks.com` too
   - **Note:** If `www` redirects to non-www, you don't need to add it here

## Step 6: Add Redirect URI to Google Cloud Console (IMPORTANT!)

This step is required for Google OAuth to work with your custom domain:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: **pinranks-efabb** (or search for it)
3. Navigate to **APIs & Services** → **Credentials**
4. Find your **OAuth 2.0 Client ID** (it should be named something like "Web client" or have your Firebase project name)
5. Click on the OAuth client to edit it
6. Under **Authorized redirect URIs**, click **Add URI**
7. Add the following redirect URI:
   ```
   https://pinranks.com/__/auth/handler
   ```
8. **If you added `www.pinranks.com` as a separate domain (not redirecting):** Add:
   ```
   https://www.pinranks.com/__/auth/handler
   ```
   - **Note:** If `www` redirects to non-www, you don't need to add this redirect URI
9. Click **Save**

**Note:** The redirect URI format is always: `https://YOUR_DOMAIN/__/auth/handler`

**Important:** If `www.pinranks.com` redirects to `pinranks.com` (server-side redirect), you only need the non-www versions. The redirect happens before OAuth, so all auth flows will use `pinranks.com`.

## Step 7: Test the Migration

1. **Visit your site:** `https://pinranks.com`
2. **Test Google Auth:**
   - Click "Login with Google"
   - The prompt should now say "Continue to pinranks.com" ✅
   - Complete the login flow to verify it works

3. **Test all functionality:**
   - Navigation
   - Authentication
   - Data loading
   - All features

## Step 8: Update GitHub Pages (Optional)

If you want to keep GitHub Pages as a backup or redirect:

1. You can leave GitHub Pages active (it won't conflict)
2. Or remove the GitHub Pages deployment
3. Or set up a redirect from GitHub Pages to Firebase Hosting

## Troubleshooting

### DNS Not Propagating
- Check DNS propagation: https://www.whatsmydns.net/
- Verify records are correct in Namecheap
- Wait up to 48 hours for full propagation

### SSL Certificate Issues
- Firebase automatically provisions SSL certificates
- Wait 10-15 minutes after domain verification
- Check Firebase Console for SSL status

### Auth Still Shows Firebase Domain
- Verify `pinranks.com` is added to Authorized domains
- Clear browser cache and cookies
- Check browser console for errors
- Verify the site is actually being served from Firebase Hosting (not cached GitHub Pages)

### Error 400: redirect_uri_mismatch
- **This is the most common issue after migration!**
- Go to Google Cloud Console → APIs & Services → Credentials
- Find your OAuth 2.0 Client ID and edit it
- Add `https://pinranks.com/__/auth/handler` to **Authorized redirect URIs**
- If using `www.pinranks.com`, also add `https://www.pinranks.com/__/auth/handler`
- Click **Save** and wait a few minutes for changes to propagate
- Clear browser cache and try again

### Site Not Loading
- Check Firebase Console → Hosting for deployment status
- Verify DNS records are correct
- Check browser console for errors
- Try accessing via Firebase URL: `https://pinranks-efabb.web.app`

### www.pinranks.com Not Working
- **If you want www to work:** Add `www.pinranks.com` as a separate custom domain in Firebase Console
- **If you want www to redirect:** Add `www.pinranks.com` as a custom domain, then configure redirect in Firebase Console
- **Common Namecheap issue:** Make sure the CNAME Host field is just `www` (NOT `www.pinranks.com`)
  - Namecheap automatically appends your domain name, so entering the full domain creates `www.pinranks.com.pinranks.com`
- Verify the CNAME Target/Value is exactly `pinranks-efabb.web.app` (or whatever Firebase provided)
- Check DNS propagation: https://www.whatsmydns.net/#CNAME/www.pinranks.com
- Wait for DNS propagation (can take a few hours, but usually works within 1-2 hours)

## Future Deployments

After migration, use Firebase Hosting for deployments:

```bash
# Deploy only hosting
npm run deploy:firebase

# Deploy everything (hosting + functions + rules)
npm run deploy:firebase:all
```

## Rollback Plan

If something goes wrong, you can:

1. **Revert DNS records** back to GitHub Pages
2. **Redeploy to GitHub Pages:** `npm run deploy`
3. **Keep Firebase Hosting** as backup at `pinranks-efabb.web.app`

## Notes

- Firebase Hosting is free (10 GB storage, 360 MB/day bandwidth)
- Both GitHub Pages and Firebase Hosting can coexist
- The custom domain can only point to one hosting provider at a time
- Firebase Hosting provides better integration with Firebase services

