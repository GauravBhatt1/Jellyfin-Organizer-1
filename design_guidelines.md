# Jellyfin Media File Organizer - Design Guidelines

## Design Approach

**Selected System**: Modern dashboard design inspired by Linear, Vercel, and shadcn/ui principles - prioritizing clarity, data density, and functional efficiency for this utility-focused media management application.

**Core Principles**:
- Information hierarchy optimized for scanning large file lists
- Clear visual states for job progress and file status
- Efficient use of screen real estate for data-heavy views
- Minimal cognitive load during complex organization tasks

---

## Typography System

**Font Family**: 
- Primary: Inter or Geist (via Google Fonts CDN)
- Monospace: JetBrains Mono for file paths and technical data

**Type Scale**:
- Page titles: `text-2xl font-semibold` (Dashboard, Scanner, Organizer)
- Section headers: `text-lg font-medium`
- Card titles: `text-base font-medium`
- Body text: `text-sm`
- Metadata/labels: `text-xs font-medium uppercase tracking-wide`
- File paths: `text-xs font-mono`

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 3, 4, 6, 8, 12, 16** for consistent rhythm
- Component padding: `p-4` to `p-6`
- Section spacing: `space-y-6` to `space-y-8`
- Card gaps: `gap-4`
- Page margins: `px-6 py-8` for main content areas

**Container Structure**:
- Sidebar navigation: Fixed `w-64`, full height
- Main content: `flex-1` with `max-w-7xl mx-auto`
- Two-column layouts for Settings and detailed views: `grid grid-cols-1 lg:grid-cols-3 gap-6`

---

## Core Components

### Navigation
**Sidebar** (left, fixed):
- Logo/app name at top (`h-16`)
- Navigation items with icons from Heroicons (24px outline)
- Active state: subtle background treatment
- Compact spacing: `py-2 px-3` per item

### Dashboard Stats Cards
**Grid layout**: `grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4`
- Card structure: `rounded-lg border p-6`
- Large number: `text-3xl font-bold`
- Label: `text-sm text-muted-foreground`
- Icon: 48px in top-right corner with reduced opacity

### Data Tables
**File/Media Lists**:
- Fixed header row with `sticky top-0`
- Column structure: checkbox (40px) | thumbnail (60px) | filename (flex-1) | metadata (200px) | status (120px) | actions (80px)
- Row height: `h-16` for comfortable scanning
- Zebra striping: subtle alternating row backgrounds
- Hover state: clear row highlight
- Status badges: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`

### Progress Indicators
**Real-time Job Progress**:
- Card container with `border-l-4` accent for active jobs
- Progress bar: `h-2 rounded-full` with animated fill
- Stats row: `text-sm` showing processed/total, new items, errors
- Current file: `text-xs font-mono truncate` with `max-w-md`
- Update animation: subtle pulse on count changes

### Forms & Settings
**Settings Page Layout**:
- Left column (2/3): Settings sections
- Right column (1/3): Help text and previews
- Input groups: `space-y-2` with label above
- Text inputs: `h-10 px-3 rounded-md border`
- Path inputs: `font-mono text-sm`
- Toggle switches: shadcn/ui Switch component
- Array inputs (folders): List with add/remove buttons, `gap-2`

### Preview Panel (Organizer)
**Organization Preview**:
- Split view: Before (left) | After (right)
- File path diff: Strike-through old path, highlighted new path
- Folder structure tree visualization
- Confidence indicator: `text-sm` with visual bar (0-100)
- Action buttons: Primary "Organize Selected" (bottom-right), Secondary "Edit" per item

### Duplicate Management
**Grouped Display**:
- Expandable groups showing duplicate sets
- Primary item marked with indicator
- Thumbnail comparison in grid: `grid-cols-2 md:grid-cols-3 gap-3`
- File size and quality metadata for comparison
- Bulk actions: Keep primary, delete duplicates

### Modals/Dialogs
**Manual Override Dialog**:
- Modal: `max-w-2xl`
- Form sections: `space-y-6`
- Type selector: Radio group with icons
- TMDB search: Autocomplete with poster thumbnails
- Preview section showing destination path updates live

---

## Icons

**Library**: Heroicons (outline style for navigation/actions, solid for status indicators)

**Usage**:
- Navigation: 24px outline (DocumentTextIcon, FilmIcon, TvIcon, CogIcon, etc.)
- Status badges: 16px solid icons
- Action buttons: 20px outline
- File type indicators: 16px solid

---

## Component States

**File/Item Status Visual Language**:
- Pending: Neutral treatment, subtle indicator
- Organized: Success indicator (checkmark icon)
- Error: Alert indicator (exclamation icon) with tooltip on hover
- Skipped: Muted appearance
- Low confidence (<60): Warning indicator with badge

**Interactive States**:
- Buttons: shadcn/ui Button variants (default, outline, ghost)
- Checkboxes: Clear selection state in tables
- Disabled states: `opacity-50 cursor-not-allowed`

---

## Page-Specific Layouts

**Scanner Page**:
- Top: Scan trigger card with folder selection
- Middle: Active job progress card (when running)
- Bottom: Recent scans history table

**Organizer Page**:
- Top: Filter bar (type, confidence, status) + bulk actions
- Main: Scrollable table with preview panel (right drawer or modal on selection)
- Bottom: Sticky action bar with "Organize X Selected Items" button

**TV Shows / Movies Pages**:
- Grid layout: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4`
- Poster cards: Aspect ratio 2:3, with overlay showing episode count/year
- Hover: Scale transform and metadata overlay

**Duplicates Page**:
- Grouped list view
- Each group: Expandable accordion with comparison grid inside

---

## Responsive Behavior

- **Mobile** (<768px): Sidebar collapses to hamburger menu, single-column layouts, hide non-essential table columns
- **Tablet** (768-1024px): Sidebar remains visible, two-column grids where appropriate
- **Desktop** (>1024px): Full layout with all features visible

---

This design prioritizes efficient file management workflows, clear status communication, and minimal friction during the organization process while maintaining a clean, modern aesthetic appropriate for a power-user utility application.