# PinRanks

A pinball machine ranking application built with React, Firebase, and Tailwind CSS.

## Features

- User authentication (Google/Facebook)
- Machine matchup voting system
- ELO-based rankings
- Machine filtering and search
- Profile management
- Responsive design with dark mode

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Firebase (Firestore, Functions, Hosting, Storage)
- **Authentication**: Firebase Auth (Google, Facebook)
- **Deployment**: Firebase Hosting + GitHub Pages

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)
- Access to Firebase project: `pinranks-efabb`

### Installation

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

3. **Set up Firebase:**
   ```bash
   firebase login
   firebase use pinranks-efabb
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173` (or the port shown in terminal)

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run deploy` - Deploy to GitHub Pages
- `npm run setup-images` - Interactive setup for image hosting
- `npm run download-images` - Download images from OPDB
- `npm run check-images` - Check which images are available locally

### Firebase Deployment

```bash
# Deploy everything
firebase deploy

# Deploy specific services
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

## Project Structure

```
pinranks/
├── src/                 # Source code
│   ├── components/      # React components
│   ├── hooks/          # Custom React hooks
│   ├── services/       # Business logic services
│   ├── utils/          # Utility functions
│   └── config.js       # Configuration
├── functions/          # Firebase Cloud Functions
├── public/             # Static assets
├── dist/               # Build output
└── scripts/            # Utility scripts
```

## Configuration

The Firebase project configuration is in:
- `src/config.js` - Project ID and region
- `src/firebase.js` - Firebase client config
- `.firebaserc` - Firebase project alias

**Note:** Firebase client config keys in `src/firebase.js` are safe to commit as they're meant for client-side use.

## Image Hosting

The project uses Firebase Storage for hosting pinball machine images. See `IMAGE_SETUP.md` for detailed setup instructions.

## Adding Collaborators

See `COLLABORATION.md` for instructions on adding collaborators to GitHub, Firebase, and domain hosting.

## License

[Your License Here]
