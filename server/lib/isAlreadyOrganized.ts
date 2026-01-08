import * as path from "path";
import { computeDestinationPath, getDestinationRoot, type ComputeDestinationParams, type DestinationSettings } from "./computeDestinationPath";

export interface IsAlreadyOrganizedParams {
  originalFullPath: string;
  detectedType: string | null;
  name: string;
  year: number | null;
  season: number | null;
  episode: number | null;
  episodeEnd: number | null;
  extension: string;
  settings: DestinationSettings;
}

export interface IsAlreadyOrganizedResult {
  organized: boolean;
  reason: string;
  resolvedDestPath?: string;
}

export function isAlreadyOrganized(params: IsAlreadyOrganizedParams): IsAlreadyOrganizedResult {
  const {
    originalFullPath,
    detectedType,
    name,
    year,
    season,
    episode,
    episodeEnd,
    extension,
    settings,
  } = params;

  const normalizedOriginal = path.normalize(originalFullPath);
  
  const destRoot = getDestinationRoot(detectedType, settings);
  if (!destRoot) {
    return { organized: false, reason: "No destination configured for this type" };
  }
  
  const normalizedDestRoot = path.normalize(destRoot);

  const expectedDestPath = computeDestinationPath(
    { detectedType, name, year, season, episode, episodeEnd, extension },
    settings
  );

  if (expectedDestPath) {
    const normalizedExpected = path.normalize(expectedDestPath);
    if (normalizedOriginal === normalizedExpected) {
      return {
        organized: true,
        reason: "File is already at expected destination path",
        resolvedDestPath: originalFullPath,
      };
    }
  }

  if (normalizedOriginal.startsWith(normalizedDestRoot + path.sep) || normalizedOriginal === normalizedDestRoot) {
    if (matchesJellyfinStructure(originalFullPath, detectedType, name, year, season, episode)) {
      return {
        organized: true,
        reason: "File is inside destination root and matches Jellyfin structure",
        resolvedDestPath: originalFullPath,
      };
    }
    
    return {
      organized: true,
      reason: "File is inside destination root folder",
      resolvedDestPath: originalFullPath,
    };
  }

  return { organized: false, reason: "File is not in destination structure" };
}

function matchesJellyfinStructure(
  fullPath: string,
  detectedType: string | null,
  name: string,
  year: number | null,
  season: number | null,
  episode: number | null
): boolean {
  const parts = fullPath.split(path.sep);
  const fileName = parts[parts.length - 1];
  
  if (detectedType === "tv_show") {
    const seasonFolderPattern = /^Season\s+(\d+)$/i;
    const filePattern = /^(.+?)\s*-\s*S(\d+)E(\d+)/i;
    
    const fileMatch = fileName.match(filePattern);
    if (!fileMatch) return false;
    
    const dirName = parts[parts.length - 2];
    const seasonMatch = dirName?.match(seasonFolderPattern);
    if (!seasonMatch) return false;
    
    const fileSeason = parseInt(fileMatch[2], 10);
    const folderSeason = parseInt(seasonMatch[1], 10);
    if (fileSeason !== folderSeason) return false;
    
    if (season !== null && fileSeason !== season) return false;
    if (episode !== null) {
      const fileEpisode = parseInt(fileMatch[3], 10);
      if (fileEpisode !== episode) return false;
    }
    
    return true;
  } else if (detectedType === "movie") {
    const movieFolderPattern = /^(.+?)\s*\((\d{4})\)$/;
    const movieFilePattern = /^(.+?)\s*\((\d{4})\)\./;
    
    const fileMatch = fileName.match(movieFilePattern);
    if (!fileMatch) return false;
    
    const dirName = parts[parts.length - 2];
    const folderMatch = dirName?.match(movieFolderPattern);
    if (!folderMatch) return false;
    
    const folderYear = parseInt(folderMatch[2], 10);
    const fileYear = parseInt(fileMatch[2], 10);
    if (folderYear !== fileYear) return false;
    
    if (year !== null && fileYear !== year) return false;
    
    return true;
  }
  
  return false;
}

export function isInsideDestinationRoot(
  folderPath: string,
  settings: DestinationSettings
): boolean {
  const normalizedFolder = path.normalize(folderPath);
  
  if (settings.moviesDestination) {
    const normalizedMovies = path.normalize(settings.moviesDestination);
    if (normalizedFolder === normalizedMovies || 
        normalizedFolder.startsWith(normalizedMovies + path.sep)) {
      return true;
    }
  }
  
  if (settings.tvShowsDestination) {
    const normalizedTV = path.normalize(settings.tvShowsDestination);
    if (normalizedFolder === normalizedTV || 
        normalizedFolder.startsWith(normalizedTV + path.sep)) {
      return true;
    }
  }
  
  return false;
}
