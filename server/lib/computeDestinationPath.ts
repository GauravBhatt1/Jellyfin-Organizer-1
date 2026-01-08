import * as path from "path";

export interface ComputeDestinationParams {
  detectedType: string | null;
  name: string;
  year: number | null;
  season: number | null;
  episode: number | null;
  episodeEnd: number | null;
  extension: string;
}

export interface DestinationSettings {
  moviesDestination: string | null;
  tvShowsDestination: string | null;
}

export function computeDestinationPath(
  params: ComputeDestinationParams,
  settings: DestinationSettings
): string | null {
  const { detectedType, name, year, season, episode, episodeEnd, extension } = params;
  
  if (detectedType === "movie") {
    if (!settings.moviesDestination) {
      return null;
    }
    
    const yearStr = year || "Unknown";
    const folderName = `${name} (${yearStr})`;
    const fileName = `${name} (${yearStr}).${extension}`;
    
    return path.join(settings.moviesDestination, folderName, fileName);
  } else if (detectedType === "tv_show") {
    if (!settings.tvShowsDestination) {
      return null;
    }
    
    const seasonNum = String(season ?? 1).padStart(2, "0");
    const episodeNum = String(episode ?? 1).padStart(2, "0");
    const episodeEndStr = episodeEnd ? `-E${String(episodeEnd).padStart(2, "0")}` : "";
    const seasonFolder = `Season ${seasonNum}`;
    const fileName = `${name} - S${seasonNum}E${episodeNum}${episodeEndStr}.${extension}`;
    
    return path.join(settings.tvShowsDestination, name, seasonFolder, fileName);
  }
  
  return null;
}

export function getDestinationRoot(
  detectedType: string | null,
  settings: DestinationSettings
): string | null {
  if (detectedType === "movie") {
    return settings.moviesDestination;
  } else if (detectedType === "tv_show") {
    return settings.tvShowsDestination;
  }
  return null;
}
