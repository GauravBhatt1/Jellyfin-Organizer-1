#!/bin/bash

# Jellyfin Media Organizer - One-Click VPS Deploy Script
# Usage: curl -fsSL <url>/deploy.sh | bash

echo "=========================================="
echo "  Jellyfin Media Organizer - VPS Deploy"
echo "=========================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Create app directory
APP_DIR="${APP_DIR:-/opt/jellyfin-organizer}"
echo "Creating app directory at $APP_DIR..."
sudo mkdir -p $APP_DIR
cd $APP_DIR

# Clone or update repository (if using git)
# git clone <your-repo-url> . || git pull

# Create default directories
echo "Creating media directories..."
sudo mkdir -p /mnt/media /mnt/movies /mnt/tvshows

# Set environment variables
export MEDIA_PATH="${MEDIA_PATH:-/mnt/media}"
export MOVIES_PATH="${MOVIES_PATH:-/mnt/movies}"
export TVSHOWS_PATH="${TVSHOWS_PATH:-/mnt/tvshows}"
export SESSION_SECRET="${SESSION_SECRET:-$(openssl rand -hex 32)}"

echo ""
echo "Configuration:"
echo "  Media Source: $MEDIA_PATH"
echo "  Movies Dest:  $MOVIES_PATH"
echo "  TV Shows Dest: $TVSHOWS_PATH"
echo ""

# Start the application
echo "Starting Jellyfin Media Organizer..."
docker-compose up -d --build

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "Access the app at: http://$(hostname -I | awk '{print $1}'):5000"
echo ""
echo "To change media paths, edit docker-compose.yml or set:"
echo "  export MEDIA_PATH=/your/media/path"
echo "  export MOVIES_PATH=/your/movies/path"
echo "  export TVSHOWS_PATH=/your/tvshows/path"
echo ""
echo "Commands:"
echo "  docker-compose logs -f    # View logs"
echo "  docker-compose restart    # Restart app"
echo "  docker-compose down       # Stop app"
echo ""
