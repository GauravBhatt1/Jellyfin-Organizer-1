import { storage } from "../storage";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

interface TMDBSearchResult {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
}

interface TMDBMovieResult {
  id: number;
  title: string;
  release_date?: string;
  poster_path: string | null;
}

interface TMDBTVResult {
  id: number;
  name: string;
  first_air_date?: string;
  poster_path: string | null;
}

interface TMDBEpisode {
  id: number;
  name: string;
  episode_number: number;
  season_number: number;
  overview?: string;
}

export interface TMDBMatch {
  tmdbId: number;
  name: string;
  year: number | null;
  posterPath: string | null;
  episodeTitle?: string;
}

async function getApiKey(): Promise<string | null> {
  const settings = await storage.getSettings();
  return settings?.tmdbApiKey || null;
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        // Rate limited - wait and retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error("Max retries exceeded");
}

function cleanSearchQuery(query: string): string {
  // Remove common non-title words and characters
  let cleaned = query
    .replace(/[^\w\s]/g, " ")
    .replace(/\b(the|a|an|and|of|in|on|at|to|for)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  
  // Limit length
  if (cleaned.length > 100) {
    cleaned = cleaned.slice(0, 100);
  }
  
  return cleaned;
}

export async function searchMovie(name: string, year?: number): Promise<TMDBMatch | null> {
  const apiKey = await getApiKey();
  if (!apiKey) return null;
  
  const cleanedName = cleanSearchQuery(name);
  if (!cleanedName) return null;
  
  try {
    let url = `${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(cleanedName)}&page=1`;
    if (year) {
      url += `&year=${year}`;
    }
    
    const response = await fetchWithRetry(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    const results: TMDBMovieResult[] = data.results || [];
    
    if (results.length === 0) return null;
    
    // Find best match
    let bestMatch = results[0];
    
    // If year provided, prefer exact year match
    if (year) {
      const exactYear = results.find((r) => {
        const rYear = r.release_date ? parseInt(r.release_date.split("-")[0]) : null;
        return rYear === year;
      });
      if (exactYear) bestMatch = exactYear;
    }
    
    const matchYear = bestMatch.release_date
      ? parseInt(bestMatch.release_date.split("-")[0])
      : null;
    
    return {
      tmdbId: bestMatch.id,
      name: bestMatch.title,
      year: matchYear,
      posterPath: bestMatch.poster_path,
    };
  } catch (error) {
    console.error("TMDB movie search error:", error);
    return null;
  }
}

export async function searchTV(name: string, year?: number): Promise<TMDBMatch | null> {
  const apiKey = await getApiKey();
  if (!apiKey) return null;
  
  const cleanedName = cleanSearchQuery(name);
  if (!cleanedName) return null;
  
  try {
    let url = `${TMDB_BASE_URL}/search/tv?api_key=${apiKey}&language=en-US&query=${encodeURIComponent(cleanedName)}&page=1`;
    if (year) {
      url += `&first_air_date_year=${year}`;
    }
    
    const response = await fetchWithRetry(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    const results: TMDBTVResult[] = data.results || [];
    
    if (results.length === 0) return null;
    
    const bestMatch = results[0];
    const matchYear = bestMatch.first_air_date
      ? parseInt(bestMatch.first_air_date.split("-")[0])
      : null;
    
    return {
      tmdbId: bestMatch.id,
      name: bestMatch.name,
      year: matchYear,
      posterPath: bestMatch.poster_path,
    };
  } catch (error) {
    console.error("TMDB TV search error:", error);
    return null;
  }
}

export async function getEpisodeTitle(
  tmdbId: number,
  season: number,
  episode: number
): Promise<string | null> {
  const apiKey = await getApiKey();
  if (!apiKey) return null;
  
  try {
    const url = `${TMDB_BASE_URL}/tv/${tmdbId}/season/${season}/episode/${episode}?api_key=${apiKey}&language=en-US`;
    
    const response = await fetchWithRetry(url);
    if (!response.ok) return null;
    
    const data: TMDBEpisode = await response.json();
    return data.name || null;
  } catch (error) {
    console.error("TMDB episode fetch error:", error);
    return null;
  }
}
