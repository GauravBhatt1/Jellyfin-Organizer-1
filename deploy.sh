#!/bin/bash

# Jellyfin Media Organizer - One-Click VPS Deploy Script
# Usage: curl -fsSL <raw-github-url>/deploy.sh | bash

set -e

echo "=========================================="
echo "  Jellyfin Media Organizer - VPS Deploy"
echo "=========================================="
echo ""

APP_DIR="/opt/jellyfin-organizer"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "[1/4] Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo systemctl start docker
    sudo systemctl enable docker
else
    echo "[1/4] Docker already installed"
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo "[2/4] Installing Docker Compose..."
    sudo apt-get update && sudo apt-get install -y docker-compose-plugin
else
    echo "[2/4] Docker Compose already installed"
fi

# Create app directory
echo "[3/4] Setting up application..."
sudo mkdir -p $APP_DIR
cd $APP_DIR

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/jellyfin_organizer
      - SESSION_SECRET=change-this-secret-key-in-production
      - NODE_ENV=production
    volumes:
      - /mnt:/mnt
      - /media:/media
      - /home:/home
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=jellyfin_organizer
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
EOF

# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git ffmpeg
RUN git clone https://github.com/YOUR_USERNAME/jellyfin-organizer.git .
RUN npm ci && npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache ffmpeg
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
EXPOSE 5000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
EOF

echo "[4/4] Starting application..."
docker compose up -d --build

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "App URL: http://$(hostname -I | awk '{print $1}'):5000"
echo ""
echo "Next Steps:"
echo "  1. Open the app in browser"
echo "  2. Go to Settings page"
echo "  3. Add your TMDB API key"
echo "  4. Configure source and destination folders"
echo ""
echo "Commands:"
echo "  cd $APP_DIR"
echo "  docker compose logs -f     # View logs"
echo "  docker compose restart     # Restart"
echo "  docker compose down        # Stop"
echo ""
