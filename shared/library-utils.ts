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
  } else {
    return { type: 'mixed', path: taggedPath };
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

export function buildSourceFoldersFromLibraries(libraries: Library[]): string[] {
  const result: string[] = [];
  
  for (const library of libraries) {
    for (const folder of library.folders) {
      result.push(encodeTaggedFolder(library.type, folder));
    }
  }
  
  return result;
}

export function extractLibrariesFromSettings(
  sourceFolders: string[],
  moviesDestination: string,
  tvShowsDestination: string
): Library[] {
  const grouped = groupFoldersByType(sourceFolders);
  
  const libraries: Library[] = [];
  
  if (grouped.movies.length > 0 || moviesDestination) {
    libraries.push({
      type: 'movies',
      folders: grouped.movies,
      destination: moviesDestination || '/organized/movies'
    });
  }
  
  if (grouped.tv.length > 0 || tvShowsDestination) {
    libraries.push({
      type: 'tv',
      folders: grouped.tv,
      destination: tvShowsDestination || '/organized/tvshows'
    });
  }
  
  if (grouped.mixed.length > 0) {
    libraries.push({
      type: 'movies',
      folders: grouped.mixed,
      destination: moviesDestination || '/organized/movies'
    });
  }
  
  return libraries;
}
