# Jellyfin Media File Organizer

## Overview

A full-stack web application for automatically organizing media libraries with TMDB integration. The app scans directories for media files (movies and TV shows), intelligently parses filenames to detect content metadata, fetches additional information from TMDB, and organizes files into structured folder hierarchies. Key features include smart file scanning, duplicate detection, real-time progress updates via WebSocket, and confidence scoring for files needing manual review.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with hot module replacement
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Real-time Updates**: WebSocket context provider for live job progress

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful endpoints under `/api/*` prefix
- **Real-time**: Native WebSocket server for broadcasting scan/organize progress
- **File Operations**: Node.js fs module for file system scanning and organization
- **Build**: esbuild for production bundling with selective dependency bundling

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Key Tables**: 
  - `media_items` - Scanned files with metadata and status
  - `settings` - Application configuration (API keys, folders)
  - `scan_jobs` / `organize_jobs` - Job tracking
  - `tv_series` / `movies` - Organized media metadata
  - `organization_logs` - File operation history

### Library Management (Jellyfin-style)
- **Library Types**: Movies and TV Shows are treated as separate libraries with their own source folders and destinations
- **Tagged Folders**: Source folders are stored with type prefixes (`MOVIES:/path`, `TV:/path`, `MIXED:/path`)
- **Library Utils** (`shared/library-utils.ts`): Encoding/decoding utilities for tagged folder format
- **Backward Compatibility**: Legacy untagged folders are preserved as "mixed" and displayed with assignment options in Settings UI

### Core Processing Pipeline
1. **Scanner** (`server/lib/scanner.ts`): Recursively scans configured source folders for media files
   - Parses tagged folder prefixes to determine library type
   - Overrides detected content type based on library (Movies library = movie, TV library = tv_show)
2. **Filename Parser** (`server/lib/parseMediaFilename.ts`): Robust pattern matching with aggressive noise removal
   - Detects TV patterns: S02E01, S02 E01, S04 EP 01, 1x02
   - Removes noise tokens: quality tags (1080p), codecs (x264), release groups (HDHub4u), languages (Hindi)
   - Extracts clean series/movie names for TMDB search
   - Example: "Fallout.S02E01.1080p.WEB-DL.Hindi.5.1-English.5.1.ESub.x264-HDHub4u.Ms.mkv" → "Fallout"
3. **TMDB Integration** (`server/lib/tmdb.ts`): Fetches metadata, posters, and episode information
4. **Organizer** (`server/lib/organizer.ts`): ALWAYS MOVES files to destination folders (destructive operation)
   - No copy mode - files are moved, not copied
   - Cross-device move: copy → verify → delete source
   - Collision handling: skip duplicates or auto-rename with "(copy 2)" suffix
   - Safety guards: blocks moves if source === destination or destination inside source
5. **Duplicate Detection**: Uses multi-criteria matching:
   - **Identity Check**: (same TMDB ID + episode) OR (normalized name + year/episode)
   - **Similarity Check**: (string similarity > 0.90) OR (duration within ±2s) OR (file size < 5%)
   - Both checks must pass to flag as duplicate
6. **Manual Override**: Items with manualOverride=true maintain locked metadata during rescans

### Project Structure
```
client/           # React frontend
  src/
    components/   # Reusable UI components
    pages/        # Route pages (dashboard, scanner, organizer, etc.)
    lib/          # Utilities, query client, WebSocket provider
server/           # Express backend
  lib/            # Core logic (scanner, organizer, parser, tmdb)
shared/           # Shared types and schema definitions
```

## External Dependencies

### Third-Party Services
- **TMDB API**: The Movie Database API for fetching movie/TV metadata, posters, and episode information. Requires API key configured in settings.

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries with schema-first approach

### Key npm Packages
- **@tanstack/react-query**: Server state management and caching
- **drizzle-orm** + **drizzle-zod**: Database ORM with Zod schema validation
- **ws**: WebSocket server for real-time updates
- **wouter**: Lightweight React router
- **Radix UI**: Accessible UI primitives (via shadcn/ui)
- **date-fns**: Date formatting utilities

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key (if sessions are used)