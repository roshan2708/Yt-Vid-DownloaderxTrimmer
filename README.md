# Cut Tadaao – Minimal Video Trimming & Downloading Service

Cut Tadaao is a fast, minimal video trimming and downloading utility. Users paste a video URL, select a start and end time (`HH:MM:SS`), and download only that specific portion of the video as a clean MP4 file.

---

## 1. Architecture Overview

Cut Tadaao decouples frontend presentation and heavy video processing:

```
[ Frontend: Next.js + Tailwind CSS (Vercel) ]
                      │
                      │ HTTP / JSON API
                      ▼
[ Backend: Node.js Express + FFmpeg (Ubuntu VPS) ]
        ├── /api/validate     (Inspects video metadata)
        ├── /api/process      (Enqueues trim job)
        ├── /api/status/:id   (Reports progress state)
        └── /api/download/:id (Streams MP4 clip)
```

- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS. Clean, responsive single-page utility tool without gradients or unnecessary cards.
- **Backend Service**: Standalone Express service handling FFmpeg keyframe trimming, yt-dlp section extraction, rate limiting, SSRF protection, and automatic temporary file cleanup.
- **Proxy Routes**: Next.js route handlers (`app/api/*`) proxy requests to the dedicated backend service (`BACKEND_URL`), ensuring seamless deployment on Vercel without CORS or file size restrictions.

---

## 2. Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend**: Node.js, Express, TypeScript, `express-rate-limit`, `cors`
- **Video Processing**: FFmpeg & `yt-dlp` for frame-accurate extraction and encoding
- **Storage**: Temporary disk storage with automatic cleanup every 5 minutes (files expire after 30 minutes)

---

## 3. Installation & Local Development

### Prerequisites

Ensure the following tools are installed on your local machine:
- **Node.js**: v18+ (v20+ recommended)
- **FFmpeg & ffprobe**: `brew install ffmpeg` (macOS) or `sudo apt install ffmpeg` (Ubuntu)
- **yt-dlp**: `brew install yt-dlp` (macOS) or standalone binary

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Default configuration:
```env
PORT=4000
NODE_ENV=development
BACKEND_URL=http://127.0.0.1:4000
```

### Step 3: Run Development Servers

Run both the backend processing server and frontend together:

```bash
npm run dev:all
```

Or run them individually in separate terminal tabs:
- **Backend Server (port 4000)**:
  ```bash
  npm run server
  ```
- **Next.js Frontend (port 3000)**:
  ```bash
  npm run dev
  ```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. API Endpoints

### 1. `POST /api/validate`
Validates the submitted video URL and returns metadata.

- **Request Body**:
  ```json
  { "url": "https://www.w3schools.com/html/mov_bbb.mp4" }
  ```
- **Response**:
  ```json
  {
    "valid": true,
    "url": "https://www.w3schools.com/html/mov_bbb.mp4",
    "title": "mov_bbb",
    "duration": 10,
    "formattedDuration": "00:00:10",
    "uploader": "generic",
    "platform": "Generic"
  }
  ```

### 2. `POST /api/process`
Accepts video URL, start time, and end time. Initiates video trimming in the background and returns a unique job ID.

- **Request Body**:
  ```json
  {
    "url": "https://www.w3schools.com/html/mov_bbb.mp4",
    "startTime": "00:00:01",
    "endTime": "00:00:04"
  }
  ```
- **Response**:
  ```json
  {
    "jobId": "664efcbd-5a6c-48a3-9a35-6e38f54c23ae",
    "status": "queued",
    "step": "Validating video URL."
  }
  ```

### 3. `GET /api/status/:jobId`
Returns processing state, progress percentage, and error details if applicable.

- **Response**:
  ```json
  {
    "jobId": "664efcbd-5a6c-48a3-9a35-6e38f54c23ae",
    "status": "completed",
    "step": "Download completed.",
    "progress": 100,
    "error": null,
    "fileName": "mov_bbb_664efcbd.mp4",
    "fileSize": 169736
  }
  ```

### 4. `GET /api/download/:jobId`
Streams the generated MP4 file to the client with `Content-Disposition: attachment`.

---

## 5. Production Deployment

### Render Deployment (Recommended All-In-One Container)

Deploy both the Next.js frontend and FFmpeg video processing backend in a single container on Render:

1. Connect your repository to [Render](https://dashboard.render.com).
2. Create a **New Web Service** and select **Docker** runtime (automatically detected via `Dockerfile`).
3. Add your Firebase environment variables.
4. Add your Render domain to Firebase Console (**Authentication -> Settings -> Authorized Domains**).
5. Detailed instructions are in [RENDER_DEPLOY.md](RENDER_DEPLOY.md).

---

### Frontend Deployment (Vercel)

1. Push your repository to GitHub / GitLab.
2. Import the project into [Vercel](https://vercel.com).
3. In Project Settings -> **Environment Variables**, set:
   ```env
   BACKEND_URL=https://api.yourdomain.com
   ```
4. Deploy! Next.js will build and serve the single-page application globally, proxying processing requests to your Ubuntu VPS.

---

### Backend Deployment (Ubuntu 22.04 / 24.04 VPS)

#### Step 1: Install System Dependencies

You can run the provided automated script:
```bash
chmod +x deploy/install-vps.sh
./deploy/install-vps.sh
```

Or manually install packages:
```bash
sudo apt update && sudo apt install -y ffmpeg python3 curl git nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install latest yt-dlp
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

#### Step 2: Deploy Project Code

```bash
sudo mkdir -p /var/www/cut-tadaao
sudo chown -R $USER:$USER /var/www/cut-tadaao
git clone <your-repo-url> /var/www/cut-tadaao
cd /var/www/cut-tadaao
npm install
```

#### Step 3: Setup Systemd Service

Copy the systemd unit file:
```bash
sudo cp deploy/cut-tadaao-backend.service /etc/systemd/system/cut-tadaao.service
sudo systemctl daemon-reload
sudo systemctl enable --now cut-tadaao
```

Verify service is running:
```bash
sudo systemctl status cut-tadaao
curl http://127.0.0.1:4000/health
```

#### Step 4: Configure Nginx & SSL

Copy the Nginx configuration:
```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/cut-tadaao
sudo ln -s /etc/nginx/sites-available/cut-tadaao /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Obtain a free SSL certificate with Let's Encrypt:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

---

## 6. Security & Resource Safeguards

- **SSRF Protection**: Private, loopback, and cloud metadata addresses (`127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`, `169.254.169.254`) are rejected immediately.
- **Authorized Sources**: Restricts downloading to authorized platforms (YouTube, Vimeo, Twitch, Reddit, X/Twitter, TikTok, Dailymotion, or direct video file extensions).
- **Rate Limiting**: Integrated `express-rate-limit` prevents spamming processing jobs (max 20 trims per 10 minutes per IP).
- **Disk Cleanup**: Background job manager cleans temporary files older than 30 minutes every 5 minutes to prevent storage exhaustion.
# Yt-Vid-DownloaderxTrimmer
