# ==============================================================
# Cut Tadaao – Production Dockerfile
# ==============================================================

FROM node:22-bookworm-slim

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

# Copy dependency manifests and scripts
COPY package*.json ./
COPY scripts ./scripts

# Install dependencies (clean install)
RUN npm ci --ignore-scripts

# Copy application source
COPY . .

# Set production environment and build Next.js
ENV NODE_ENV=production
RUN npm run build

# Ports configuration
ENV PORT=10000
ENV BACKEND_PORT=4000
ENV BACKEND_URL=http://127.0.0.1:4000

EXPOSE 10000

# Start both backend video processing service and Next.js frontend
CMD ["npm", "run", "start:all"]
