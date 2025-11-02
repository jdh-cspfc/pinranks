# Adding Collaborators Guide

This guide outlines how to add collaborators to this project across all platforms.

## Overview

This project is deployed on:
- **GitHub** - Source code repository
- **Firebase** - Backend services (Firestore, Functions, Hosting, Storage)
- **Domain Hosting** - Custom domain (check your domain provider)

## 1. Adding Collaborators to GitHub

### Option A: Add as Collaborators (Recommended for small teams)

1. Go to your repository on GitHub
2. Click **Settings** → **Collaborators** → **Add people**
3. Enter their GitHub username or email
4. Choose their permission level:
   - **Write** - Can push code, create branches, merge PRs (recommended)
   - **Read** - View-only access
5. They'll receive an email invitation

### Option B: Create a GitHub Organization (Recommended for long-term)

1. Create a new organization at https://github.com/organizations/new
2. Transfer or add the repository to the organization
3. Add collaborators as members
4. Set up teams with appropriate permissions

## 2. Adding Collaborators to Firebase

### Step 1: Access Firebase Console

1. Go to https://console.firebase.google.com
2. Select your project: **pinranks-efabb**

### Step 2: Add IAM Members

1. Click the **⚙️ gear icon** → **Project settings**
2. Go to the **Users and permissions** tab
3. Click **Add principal**
4. Enter the collaborator's email address
5. Assign roles based on their needs:

   **Recommended Roles:**
   - **Firebase Admin** - Full access (use sparingly)
   - **Firebase Editor** - Can deploy, modify resources, but can't manage billing (good for developers)
   - **Firebase Viewer** - Read-only access (good for stakeholders)

6. Click **Save**

### Step 3: Firebase CLI Setup (For Developers)

Collaborators with Editor/Admin access need to:

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Verify access:
   ```bash
   firebase projects:list
   ```

4. Initialize the project (if needed):
   ```bash
   firebase use pinranks-efabb
   ```

### Important Notes:

- **Firebase config keys** in `src/firebase.js` are safe to commit (they're client-side keys)
- The `.firebaserc` file should be committed so all collaborators use the same project
- Collaborators should **NOT** deploy to production without coordination
- Consider using separate Firebase projects for development/staging/production

## 3. Namecheap Domain Hosting Access

This project uses **Namecheap** for domain registration and DNS management.

### Limitations:
Unfortunately, Namecheap does **not** support adding team members or collaborators to a single account. You have a few options:

### Option A: Share Account Credentials (Simple but Less Secure)
1. Store credentials in a secure password manager (1Password, LastPass, Bitwarden)
2. Share access to the password entry with trusted collaborators
3. Enable 2FA on the Namecheap account for additional security

### Option B: Transfer Domain to Cloudflare (Recommended for Long-term)
Cloudflare offers better collaboration features:
1. Transfer domain from Namecheap to Cloudflare (often cheaper, too)
2. Go to Cloudflare dashboard → **Manage Account** → **Members**
3. Invite collaborators by email with specific permission levels
4. No need to share passwords

### Option C: Create a Shared Team Account
1. Create a new Namecheap account with a shared email
2. Transfer domain to the team account
3. Share login credentials securely

### Managing DNS Records:
To modify DNS records (for collaborators with account access):
1. Log into Namecheap account at https://www.namecheap.com
2. Go to **Domain List**
3. Click **Manage** next to your domain
4. Go to **Advanced DNS** tab
5. Add/Modify DNS records (A, CNAME, MX, TXT, etc.)

**Important DNS Records to Document:**
- Firebase Hosting records (usually CNAME or A records)
- Email MX records (if using custom email)
- Any SPF/DKIM/DMARC records for email authentication

## 4. Gmail SMTP Email Configuration

The project uses a **Gmail account with SMTP** to send emails that appear to come from your custom domain. This setup needs to be documented and potentially shared with collaborators.

### Current Setup Details to Document:
Store these details securely (password manager or secure document):

1. **Gmail Account:**
   - Email address: `[YOUR_EMAIL]@gmail.com`
   - App password (not regular password): `[APP_PASSWORD]` 
   - SMTP server: `smtp.gmail.com`
   - SMTP port: `587` (TLS) or `465` (SSL)

2. **Email Authentication (SPF/DKIM):**
   - **SPF Record** in Namecheap DNS should include Gmail:
     ```
     v=spf1 include:_spf.google.com ~all
     ```
   - **DKIM Record** - Set up in Google Workspace (if using) or via Gmail settings
   - **DMARC Record** (optional but recommended):
     ```
     v=DMARC1; p=quarantine; rua=mailto:[YOUR_EMAIL]
     ```

### For Collaborators Who Need to Send Emails:

**Option A: Share Gmail App Password (Limited Access)**
1. Generate a new Gmail App Password (Google Account → Security → 2-Step Verification → App Passwords)
2. Share only the app password (not main account password)
3. Collaborators can use the same SMTP settings with their own app password

**Option B: Create a Service Account Email (Recommended)**
1. Set up Google Workspace for your domain (if not already)
2. Create a service account: `noreply@yourdomain.com` or `service@yourdomain.com`
3. Share credentials for this account only
4. Use this for application emails

**Option C: Use Firebase Extension for Email (Best for Apps)**
1. Use Firebase Extensions like "Trigger Email" or "Send Email via SMTP"
2. Configure SMTP in Firebase (using App Password)
3. Collaborators with Firebase Editor access can deploy email functions

### Documenting Email Configuration:

Create a secure document with:
```
Email Service: Gmail SMTP
SMTP Server: smtp.gmail.com
SMTP Port: 587
Security: STARTTLS
Username: [YOUR_GMAIL_ACCOUNT]
Password: [APP_PASSWORD - Generate new one for each collaborator if needed]

DNS Records (in Namecheap):
- SPF: v=spf1 include:_spf.google.com ~all
- DMARC: [if configured]
- DKIM: [if configured]
```

### Where Email is Used in the Project:

Currently, the codebase uses Firebase Auth's built-in email functionality (`sendPasswordResetEmail`). If you have custom SMTP email functionality set up:

**Check these locations for email configuration:**
- `functions/index.js` - Firebase Functions that send emails
- Environment variables or Firebase Functions config (should use secrets)
- Firebase Extensions (like "Trigger Email" or "Send Email via SMTP")
- Any custom email service integrations

**Security Best Practice:**
- Store SMTP credentials in Firebase Functions environment variables:
  ```bash
  firebase functions:config:set smtp.host="smtp.gmail.com" smtp.port="587" smtp.user="your-email@gmail.com" smtp.pass="your-app-password"
  ```
- Or use Firebase Secret Manager for sensitive credentials
- **Never commit** email passwords or API keys to the repository

## 5. Development Setup for New Collaborators

Have new collaborators follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/pinranks.git
   cd pinranks
   ```

2. **Install dependencies:**
   ```bash
   npm install
   cd functions && npm install && cd ..
   ```

3. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   ```

4. **Login to Firebase:**
   ```bash
   firebase login
   ```

5. **Verify Firebase project:**
   ```bash
   firebase use pinranks-efabb
   ```

6. **Run development server:**
   ```bash
   npm run dev
   ```

7. **Read the documentation:**
   - `README.md` - Project overview
   - `IMAGE_SETUP.md` - Image hosting setup

## 6. Best Practices

### Code Collaboration:
- Use **feature branches** for new work
- Create **Pull Requests** for code review
- Require **approval** before merging to main (GitHub settings)
- Use **conventional commits** for clarity

### Deployment:
- Coordinate deployments to avoid conflicts
- Test locally before deploying
- Consider a **staging environment** before production
- Document any manual deployment steps

### Security:
- Never commit `.env` files or service account keys
- Firebase client config is safe (already in `src/firebase.js`)
- If using service account keys for CI/CD, store them in GitHub Secrets
- Rotate passwords/keys if shared credentials are compromised

### Communication:
- Document important decisions in the README or docs
- Use GitHub Issues for bug tracking
- Use GitHub Discussions for questions/ideas

## 7. Setting Up CI/CD (Optional but Recommended)

Consider setting up GitHub Actions for automated deployments:

1. Go to GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Add Firebase service account token or use `firebase login --no-localhost` for CI
3. Create `.github/workflows/deploy.yml` for automated deployments

This allows collaborators to deploy via PR merges without direct Firebase access.

## 8. Emergency Access

If you become unavailable, ensure someone can:
- Access the GitHub repository (admin rights)
- Access Firebase console (Firebase Admin role)
- Access domain DNS settings (document provider)
- Know where secrets/API keys are stored (password manager)

Consider creating a shared password manager entry or secure document with:
- **GitHub**: Repository access and any deploy keys
- **Firebase**: Service account keys (if used for CI/CD)
- **Namecheap**: Account login credentials, 2FA backup codes
- **Gmail SMTP**: Gmail account, app password, SMTP settings
- **DNS Records**: SPF, DKIM, DMARC records for email authentication
- **Domain**: Current DNS configuration (A, CNAME, MX records)
- **Important Contact Info**: Domain registrar support, hosting provider support

### Recommended Password Manager Setup:
1. Create a shared vault/collection (1Password, LastPass Business, etc.)
2. Create entries for each service:
   - Namecheap Account
   - Gmail SMTP Credentials
   - Firebase Service Account (if any)
   - Emergency contacts
3. Share vault access with trusted collaborators
4. Enable 2FA on the password manager itself

## Questions?

If you need help setting up collaborators, refer to:
- [Firebase IAM Documentation](https://firebase.google.com/docs/projects/iam/overview)
- [GitHub Collaborator Guide](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-user-account/managing-access-to-your-personal-repositories/inviting-collaborators-to-a-personal-repository)
