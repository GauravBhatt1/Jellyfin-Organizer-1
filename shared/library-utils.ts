export type LibraryType = 'movies' | 'tv' | 'mixed';

export interface LibraryFolder {
  type: LibraryType;
  path: string;
}

export interface Library {
  type: 'movies' | 'tv';
  folders: string[];
  destination: string;
}

export function encodeTaggedFolder(type: LibraryType, path: string): string {
  const prefix = type === 'movies' ? 'MOVIES' : type === 'tv' ? 'TV' : 'MIXED';
  return `${prefix}:${path}`;
}

export function decodeTaggedFolder(taggedPath: string): LibraryFolder {
  const colonIndex = taggedPath.indexOf(':');
  
  if (colonIndex === -1) {
    return { type: 'mixed', path: taggedPath };
  }
  
  const prefix = taggedPath.substring(0, colonIndex).toUpperCase();
  const path = taggedPath.substring(colonIndex + 1);
  
  if (prefix === 'MOVIES') {
    return { type: 'movies', path };
  } else if (prefix === 'TV') {
    return { type: 'tv', path };
  } else if (prefix === 'MIXED') {
    return { type: 'mixed', path };
  } else {
    return { type: 'mixed', path };
  }
}

export function parseSourceFolders(sourceFolders: string[]): LibraryFolder[] {
  return sourceFolders.map(decodeTaggedFolder);
}

export function groupFoldersByType(sourceFolders: string[]): { movies: string[]; tv: string[]; mixed: string[] } {
  const result = { movies: [] as string[], tv: [] as string[], mixed: [] as string[] };
  
  for (const folder of sourceFolders) {
    const { type, path } = decodeTaggedFolder(folder);
    result[type].push(path);
  }
  
  return result;
}

export interface MixedFolderEntry {
  path: string;
  originalTagged: string;
}

export function buildSourceFoldersFromLibraries(
  libraries: Library[], 
  mixedFolders: MixedFolderEntry[] = []
): string[] {
  const result: string[] = [];
  
  for (const library of libraries) {
    for (const folder of library.folders) {
      result.push(encodeTaggedFolder(library.type, folder));
    }
  }
  
  for (const mixed of mixedFolders) {
    result.push(mixed.originalTagged);
  }
  
  return result;
}

export interface ExtractedLibrariesResult {
  libraries: Library[];
  mixedFolders: MixedFolderEntry[];
}

export function extractLibrariesFromSettings(
  sourceFolders: string[],
  moviesDestination: string | null | undefined,
  tvShowsDestination: string | null | undefined
): ExtractedLibrariesResult {
  const libraries: Library[] = [];
  const mixedFolders: MixedFolderEntry[] = [];
  
  const moviesFolders: string[] = [];
  const tvFolders: string[] = [];
  
  for (const folder of sourceFolders) {
    const decoded = decodeTaggedFolder(folder);
    if (decoded.type === 'movies') {
      moviesFolders.push(decoded.path);
    } else if (decoded.type === 'tv') {
      tvFolders.push(decoded.path);
    } else {
      mixedFolders.push({ path: decoded.path, originalTagged: folder });
    }
  }
  
  const hasMovies = moviesFolders.length > 0 || !!moviesDestination;
  const hasTV = tvFolders.length > 0 || !!tvShowsDestination;
  
  if (hasMovies) {
    libraries.push({
      type: 'movies',
      folders: moviesFolders,
      destination: moviesDestination || '/organized/movies'
    });
  }
  
  if (hasTV) {
    libraries.push({
      type: 'tv',
      folders: tvFolders,
      destination: tvShowsDestination || '/organized/tvshows'
    });
  }
  
  return { libraries, mixedFolders };
}
