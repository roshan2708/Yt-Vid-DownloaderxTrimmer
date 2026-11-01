# Deploying ClipDown on Render

This guide provides step-by-step instructions to deploy ClipDown to [Render](https://render.com) using the included production **Dockerfile**.

Because ClipDown relies on **FFmpeg** and **yt-dlp** for high-performance video trimming and merging, deploying with Docker ensures all media binaries and dependencies are automatically installed and configured.

---

## Prerequisites

1. A [Render account](https://dashboard.render.com).
2. Your ClipDown repository pushed to GitHub or GitLab.
3. Your Firebase project credentials (already configured in your `.env.local`).

---

## Step 1: Create a New Web Service on Render

1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** in the top right corner and select **Web Service**.
3. Connect your GitHub/GitLab account and select your `ytviddownloader` repository.

---

## Step 2: Configure Service Settings

Render will detect the `Dockerfile` in the root directory. Fill in the following settings:

| Field | Value |
|---|---|
| **Name** | `clipdown` (or your preferred name) |
| **Region** | Choose the region closest to your users (e.g., *Oregon (US West)* or *Frankfurt (EU)*) |
| **Branch** | `main` |
| **Runtime** | **Docker** (Render automatically selects this if `Dockerfile` is present) |
| **Plan Type** | **Free** (or *Starter* for faster processing & no spin-down) |

---

## Step 3: Add Environment Variables on Render

In the **Environment Variables** section on Render, add the following variables:

### Firebase Client Variables
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCak7RwITt8nOFeBHJc1QRXtOeQyN-0x9I
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=clipkaro-effc2.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=clipkaro-effc2
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=clipkaro-effc2.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=560961759290
NEXT_PUBLIC_FIREBASE_APP_ID=1:560961759290:web:9f5d7687c1b9dc703c6d03
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-6MWGZVTT3X
```

### Backend & Server Variables
```env
NODE_ENV=production
FIREBASE_PROJECT_ID=clipkaro-effc2
BACKEND_PORT=4000
BACKEND_URL=http://127.0.0.1:4000
```

*(Optional: If you generate a Firebase Service Account key, you can also add `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`)*.

---

## Step 4: Authorize Your Render Domain in Firebase (Crucial)

Google OAuth requires your production domain to be on Firebase's authorized domains list.

1. Once your Render deployment begins, note your Render URL:  
   `https://clipdown-xxxx.onrender.com`
2. Open the [Firebase Console](https://console.firebase.google.com).
3. Select your project **`clipkaro-effc2`**.
4. Go to **Authentication** -> **Settings** tab -> **Authorized domains**.
5. Click **Add domain** and enter your Render hostname:  
   `clipdown-xxxx.onrender.com` (without `https://`).
6. Click **Save**.

---

## Step 5: Deploy & Verify

1. Click **Deploy Web Service** at the bottom of the Render setup page.
2. Render will build the Docker container:
   - Installs Debian packages: `ffmpeg`, `python3`, `ca-certificates`.
   - Downloads the latest `yt-dlp` binary.
   - Installs Node dependencies and builds Next.js.
   - Starts both the backend processing engine and Next.js frontend in one unified container.
3. Once the build finishes and status displays **Live**:
   - Open your Render URL.
   - Click "Fetch Video" on any video URL.
   - Sign in with Google.
   - Download full video or trimmed clips!

---

## Alternative: One-Click Render Blueprint

If you prefer using Render Blueprints:
1. In Render Dashboard, click **New +** -> **Blueprint**.
2. Select your repository.
3. Render will read [`render.yaml`](file:///Users/sher/ytviddownloader/ytviddownloader/render.yaml), prompt you for any unset environment variables, and deploy automatically.
