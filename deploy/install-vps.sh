#!/usr/bin/env bash
# ==============================================================
# Cut Tadaao VPS Setup Script for Ubuntu 22.04 / 24.04 LTS
# ==============================================================
set -e

echo "=== Updating package repositories ==="
sudo apt-get update -y
sudo apt-get upgrade -y

echo "=== Installing FFmpeg, Python3, and utilities ==="
sudo apt-get install -y ffmpeg python3 python3-pip curl git nginx

echo "=== Installing yt-dlp binary ==="
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

echo "=== Installing Node.js 20 LTS ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "=== Verifying tool installations ==="
ffmpeg -version | head -n 1
yt-dlp --version
node -v
npm -v

echo "=== Setup complete! ==="
echo "Now copy your codebase to /var/www/cut-tadaao, run 'npm install', and start the service."
