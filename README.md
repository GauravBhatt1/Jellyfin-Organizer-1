# Jellyfin Media File Organizer

A full-stack web application for automatically organizing your media library with TMDB integration.

## Features

- **Smart File Scanning**: Recursively scan directories for media files
- **Intelligent Parsing**: Detect movies and TV shows from filenames with pattern matching
- **TMDB Integration**: Fetch metadata, posters, and episode information
- **Automated Organization**: Copy or move files to organized folder structures
- **Duplicate Detection**: Identify and manage duplicate media files
- **Real-time Progress**: WebSocket-based live updates for scan and organize jobs
- **Confidence Scoring**: Visual indicators for files that need manual review

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL 16+

### Setup

1. Clone the repository

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/jellyfin_organizer"
export SESSION_SECRET="your-secret-key"
```

4. Push the database schema:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Docker Deployment (VPS with Portainer)

### Using Docker Compose

1. Clone the repository on your VPS:
```bash
cd ~
git clone https://github.com/GauravBhatt1/Jellyfin-Organizer-1.git
cd Jellyfin-Organizer-1
```

2. Configure your media paths in `docker-compose.yml`:
```yaml
volumes:
  # These paths are already configured:
  - /:/host:ro           # Browse entire VPS filesystem (read-only)
  - /mnt:/mnt            # Common mount point
  - /media:/media        # Media folder
  - /home:/home          # Home directories
  - /data:/data          # Data folder
  
  # Add your custom paths:
  - /path/to/your/media:/path/to/your/media
```

**Important**: The paths on the LEFT side must exist on your VPS. The folder browser will show these mounted directories.

3. Set environment variables (optional):
```bash
export SESSION_SECRET="your-production-secret"
```

4. Build and start:
```bash
docker-compose build --no-cache
docker-compose up -d
```

The application will be available at `http://your-vps-ip:5000`

### Folder Access

When you click the + button to add folders in Settings, you'll see the directories that are mounted in `docker-compose.yml`. To access your media files:

1. **Option 1**: Use the pre-mounted paths (`/mnt`, `/media`, `/home`, `/data`)
2. **Option 2**: Browse via `/host` which shows your entire VPS filesystem (read-only)
3. **Option 3**: Add custom volume mounts in `docker-compose.yml` for your specific folders

## Configuration

All configuration is done through the Settings page in the GUI:

1. **TMDB API Key**: Required for fetching metadata. Get one at [TMDB](https://www.themoviedb.org/settings/api)
2. **Source Folders**: Directories to scan for media files
3. **Movies Destination**: Where to organize movies
4. **TV Shows Destination**: Where to organize TV shows
5. **Copy Mode**: Copy files (default) or move them
6. **Auto Organize**: Automatically organize high-confidence items after scan

## File Organization

### Movies
```
Movies/
  Movie Name (Year)/
    Movie Name (Year).mkv
```

### TV Shows
```
TV Shows/
  Series Name/
    Season 01/
      Series Name - S01E01.mkv
      Series Name - S01E02-E03.mkv  # Multi-episode
    Season 00/
      Series Name - S00E01.mkv      # Specials
```

## Supported File Extensions

mkv, mp4, avi, mov, wmv, flv, webm, m4v, ts, m2ts

## Filename Parsing

The parser supports various naming conventions:

- **TV Shows**: S01E01, S01.E01, 1x01, Season 1 Episode 1
- **Multi-episode**: S01E01E02, S01E01-03
- **Specials**: S00E01, OVA, Special
- **Season Packs**: Season 01, Complete Season
- **Movies**: Movie Name (2024), Movie.Name.2024

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/settings | Get current settings |
| POST | /api/settings | Update settings |
| GET | /api/media-items | List media items with filters |
| PATCH | /api/media-items/:id | Update a media item |
| DELETE | /api/media-items/:id | Delete a media item |
| POST | /api/scan | Start a scan job |
| GET | /api/scan/:id | Get scan job status |
| POST | /api/organize | Start organization for selected items |
| GET | /api/organize/:id | Get organize job status |
| GET | /api/duplicates | Get duplicate groups |
| GET | /api/stats | Get dashboard statistics |
| GET | /api/tv-series | List TV series |
| GET | /api/movies | List movies |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| scan:progress | Server → Client | Scan job progress update |
| scan:done | Server → Client | Scan job completed |
| organize:progress | Server → Client | Organize job progress update |
| organize:done | Server → Client | Organize job completed |

## License

MIT
