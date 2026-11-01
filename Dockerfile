# ==============================================================
# ClipDown – Production Dockerfile for Render Deployment
# ==============================================================

FROM node:20-bookworm-slim

# Install FFmpeg, Python3, and yt-dlp
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    curl \
    ca-certificates \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies (clean install)
RUN npm ci

# Copy application source
COPY . .

# Set production environment and build Next.js
ENV NODE_ENV=production
RUN npm run build

# Render assigns a dynamic port via $PORT (defaults to 10000)
ENV PORT=10000
ENV BACKEND_PORT=4000
ENV BACKEND_URL=http://127.0.0.1:4000

EXPOSE 10000

# Start both backend video processing service and Next.js frontend
CMD ["npm", "run", "start:all"]
