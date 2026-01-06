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

### Core Processing Pipeline
1. **Scanner** (`server/lib/scanner.ts`): Recursively scans configured source folders for media files
2. **Filename Parser** (`server/lib/filename-parser.ts`): Pattern matching to extract title, year, season/episode from filenames
3. **TMDB Integration** (`server/lib/tmdb.ts`): Fetches metadata, posters, and episode information
4. **Organizer** (`server/lib/organizer.ts`): Copies or moves files to destination folders with proper naming

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