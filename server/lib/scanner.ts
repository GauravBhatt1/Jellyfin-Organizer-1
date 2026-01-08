import * as fs from "fs";
import * as path from "path";
import { storage } from "../storage";
import { parseFilename, isSupportedExtension } from "./filename-parser";
import { searchMovie, searchTV, getEpisodeTitle } from "./tmdb";
import { getMediaDuration } from "./media-utils";
import type { MediaItem } from "@shared/schema";
import type { WSMessage } from "@shared/schema";

export type WSBroadcast = (message: WSMessage) => void;

let isScanning = false;

// String similarity for duplicate detection (Levenshtein ratio)
function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  if (aLower === bLower) return 1;
  
  const longer = aLower.length > bLower.length ? aLower : bLower;
  const shorter = aLower.length > bLower.length ? bLower : aLower;
  
  if (longer.length === 0) return 1;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

interface DuplicateCheckParams {
  tmdbId: number | null;
  season: number | null;
  episode: number | null;
  fileSize: number;
  duration: number | null;
  cleanedName: string | null;
  tmdbName: string | null;
  year: number | null;
  detectedType: string | null;
}

// Find duplicate based on the rule:
// (same TMDB+season/episode OR same name+year) AND (string similarity > 0.90 OR duration within ±2s)
async function findDuplicate(params: DuplicateCheckParams): Promise<string | null> {
  const { tmdbId, season, episode, fileSize, duration, cleanedName, tmdbName, year, detectedType } = params;
  const allItems = await storage.getMediaItems();
  
  for (const item of allItems) {
    // Skip items of different type
    if (item.detectedType !== detectedType) continue;
    // Skip items that are already duplicates (find the primary)
    if (item.duplicateOf) continue;
    
    // IDENTITY CHECK: (same TMDB+season/episode) OR (same name+year)
    let identityMatch = false;
    
    // Check 1: TMDB ID match
    if (tmdbId && item.tmdbId && item.tmdbId === tmdbId) {
      if (detectedType === "tv_show") {
        // For TV shows, also require same season+episode
        if (season !== null && episode !== null && item.season !== null && item.episode !== null) {
          if (item.season === season && item.episode === episode) {
            identityMatch = true;
          }
        }
      } else {
        // For movies, TMDB ID match is enough identity
        identityMatch = true;
      }
    }
    
    // Check 2: Normalized name + Year/episode match (for when at least one side lacks TMDB)
    // This uses relaxed name matching (normalized equality) - similarity is checked separately
    if (!identityMatch) {
      const existingName = item.cleanedName || item.detectedName || item.tmdbName || "";
      const newName = cleanedName || tmdbName || "";
      
      if (existingName && newName) {
        // Normalize names: lowercase, remove non-alphanumeric, trim
        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
        const normalizedExisting = normalize(existingName);
        const normalizedNew = normalize(newName);
        
        // Names match if normalized versions are equal or one contains the other
        const namesMatch = normalizedExisting === normalizedNew || 
                          (normalizedExisting.length > 3 && normalizedNew.length > 3 && 
                           (normalizedExisting.includes(normalizedNew) || normalizedNew.includes(normalizedExisting)));
        
        if (namesMatch) {
          if (detectedType === "movie") {
            // For movies, also require year match
            if (year && item.year && year === item.year) {
              identityMatch = true;
            }
          } else if (detectedType === "tv_show") {
            // For TV shows, require season+episode match
            if (season !== null && episode !== null && item.season !== null && item.episode !== null) {
              if (item.season === season && item.episode === episode) {
                identityMatch = true;
              }
            }
          }
        }
      }
    }
    
    if (!identityMatch) continue;
    
    // SIMILARITY CHECK: (string similarity > 0.90) OR (file size within 5%)
    let similarityMatch = false;
    
    // Check A: String similarity > 0.90
    const existingNameForSim = item.cleanedName || item.detectedName || item.tmdbName || "";
    const newNameForSim = cleanedName || tmdbName || "";
    
    if (existingNameForSim && newNameForSim && stringSimilarity(existingNameForSim, newNameForSim) > 0.90) {
      similarityMatch = true;
    }
    
    // Also check TMDB name similarity
    if (!similarityMatch && item.tmdbName && tmdbName && stringSimilarity(item.tmdbName, tmdbName) > 0.90) {
      similarityMatch = true;
    }
    
    // Check B: Duration within ±2 seconds
    if (!similarityMatch && duration !== null && item.duration !== null) {
      const durationDiff = Math.abs(item.duration - duration);
      if (durationDiff <= 2) {
        similarityMatch = true;
      }
    }
    
    // Fallback Check C: File size within 5% (when duration not available)
    if (!similarityMatch && (duration === null || item.duration === null)) {
      const sizeDiff = Math.abs((item.fileSize || 0) - fileSize);
      const maxSize = Math.max(item.fileSize || 1, fileSize);
      const sizeRatio = sizeDiff / maxSize;
      
      if (sizeRatio < 0.05) {
        similarityMatch = true;
      }
    }
    
    // Both identity AND similarity must match
    if (identityMatch && similarityMatch) {
      return item.id;
    }
  }
  
  return null;
}

export async function startScan(broadcast: WSBroadcast): Promise<string> {
  if (isScanning) {
    throw new Error("A scan is already in progress");
  }

  const settings = await storage.getSettings();
  if (!settings?.sourceFolders || settings.sourceFolders.length === 0) {
    throw new Error("No source folders configured");
  }

  isScanning = true;
  
  const job = await storage.createScanJob({
    status: "running",
    totalFiles: 0,
    processedFiles: 0,
    newItems: 0,
    errorsCount: 0,
  });

  // Run scan in background
  runScan(job.id, settings.sourceFolders, broadcast).finally(() => {
    isScanning = false;
  });

  return job.id;
}

async function runScan(
  jobId: string,
  sourceFolders: string[],
  broadcast: WSBroadcast
): Promise<void> {
  let totalFiles = 0;
  let processedFiles = 0;
  let newItems = 0;
  let errorsCount = 0;

  try {
    // First pass: count files
    for (const folder of sourceFolders) {
      try {
        totalFiles += await countMediaFiles(folder);
      } catch (error) {
        console.error(`Error counting files in ${folder}:`, error);
        errorsCount++;
      }
    }

    await storage.updateScanJob(jobId, { totalFiles });
    broadcast({
      type: "scan:progress",
      data: { jobId, totalFiles, processedFiles, currentFolder: "", newItems, errorsCount },
    });

    // Second pass: process files
    for (const folder of sourceFolders) {
      try {
        const result = await scanDirectory(
          folder,
          folder,
          jobId,
          broadcast,
          processedFiles,
          totalFiles,
          newItems,
          errorsCount
        );
        processedFiles = result.processedFiles;
        newItems = result.newItems;
        errorsCount = result.errorsCount;
      } catch (error) {
        console.error(`Error scanning folder ${folder}:`, error);
        errorsCount++;
      }
    }

    await storage.updateScanJob(jobId, {
      status: "completed",
      processedFiles,
      newItems,
      errorsCount,
    });

    broadcast({ type: "scan:done", data: { jobId, status: "completed" } });
  } catch (error) {
    console.error("Scan error:", error);
    await storage.updateScanJob(jobId, {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    broadcast({ type: "scan:done", data: { jobId, status: "failed" } });
  }
}

async function countMediaFiles(dir: string): Promise<number> {
  let count = 0;

  try {
    const stats = await fs.promises.lstat(dir);
    
    // Skip symlinks
    if (stats.isSymbolicLink()) {
      return 0;
    }

    if (stats.isDirectory()) {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isSymbolicLink()) continue;
        
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          count += await countMediaFiles(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).slice(1).toLowerCase();
          if (isSupportedExtension(ext)) {
            count++;
          }
        }
      }
    }
  } catch (error) {
    // Handle permission errors, network timeouts, etc.
    console.error(`Error counting files in ${dir}:`, error);
  }

  return count;
}

async function scanDirectory(
  dir: string,
  rootFolder: string,
  jobId: string,
  broadcast: WSBroadcast,
  processedFiles: number,
  totalFiles: number,
  newItems: number,
  errorsCount: number
): Promise<{ processedFiles: number; newItems: number; errorsCount: number }> {
  try {
    const stats = await fs.promises.lstat(dir);
    
    // Skip symlinks
    if (stats.isSymbolicLink()) {
      return { processedFiles, newItems, errorsCount };
    }

    // Block path traversal
    const normalizedDir = path.normalize(dir);
    const normalizedRoot = path.normalize(rootFolder);
    if (!normalizedDir.startsWith(normalizedRoot)) {
      console.error(`Path traversal blocked: ${dir}`);
      return { processedFiles, newItems, errorsCount: errorsCount + 1 };
    }

    if (stats.isDirectory()) {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isSymbolicLink()) continue;
        
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const result = await scanDirectory(
            fullPath,
            rootFolder,
            jobId,
            broadcast,
            processedFiles,
            totalFiles,
            newItems,
            errorsCount
          );
          processedFiles = result.processedFiles;
          newItems = result.newItems;
          errorsCount = result.errorsCount;
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).slice(1).toLowerCase();
          
          if (isSupportedExtension(ext)) {
            try {
              const fileStats = await fs.promises.stat(fullPath);
              const existingItem = await storage.getMediaItemByPath(dir, entry.name);
              
              // Skip if already exists with same size
              if (existingItem && existingItem.fileSize === fileStats.size) {
                processedFiles++;
              } else {
                // Parse filename
                const parentFolder = path.basename(dir);
                const parsed = parseFilename(entry.name, parentFolder);
                
                // Try TMDB lookup
                let tmdbMatch = null;
                let episodeTitle = null;
                if (parsed.detectedType === "movie" && parsed.detectedName) {
                  tmdbMatch = await searchMovie(parsed.detectedName, parsed.year || undefined);
                } else if (parsed.detectedType === "tv_show" && parsed.detectedName) {
                  tmdbMatch = await searchTV(parsed.detectedName);
                  // Fetch episode title if we have season/episode info
                  if (tmdbMatch && parsed.season !== null && parsed.episode !== null) {
                    episodeTitle = await getEpisodeTitle(tmdbMatch.tmdbId, parsed.season, parsed.episode);
                  }
                }

                // Calculate confidence
                let confidence = parsed.confidence;
                if (tmdbMatch) {
                  confidence += 20;
                }
                confidence = Math.min(100, confidence);

                // Extract duration for duplicate detection
                const duration = await getMediaDuration(fullPath);

                // Check for duplicates - works with or without TMDB match
                let duplicateOf = await findDuplicate({
                  tmdbId: tmdbMatch?.tmdbId || null,
                  season: parsed.season,
                  episode: parsed.episode,
                  fileSize: fileStats.size,
                  duration,
                  cleanedName: parsed.cleanedName,
                  tmdbName: tmdbMatch?.name || null,
                  year: tmdbMatch?.year || parsed.year,
                  detectedType: parsed.detectedType,
                });

                const mediaData = {
                  originalFilename: entry.name,
                  originalPath: dir,
                  fileSize: fileStats.size,
                  extension: ext,
                  detectedType: parsed.detectedType,
                  detectedName: parsed.detectedName,
                  cleanedName: parsed.cleanedName,
                  year: tmdbMatch?.year || parsed.year,
                  season: parsed.season,
                  episode: parsed.episode,
                  episodeEnd: parsed.episodeEnd,
                  episodeTitle,
                  duration,
                  isSeasonPack: parsed.isSeasonPack,
                  status: "pending" as const,
                  confidence,
                  tmdbId: tmdbMatch?.tmdbId || null,
                  tmdbName: tmdbMatch?.name || null,
                  posterPath: tmdbMatch?.posterPath || null,
                  duplicateOf,
                };

                if (existingItem) {
                  // Respect manual overrides - don't overwrite locked fields
                  if (existingItem.manualOverride) {
                    // Only update file-related fields, not metadata
                    await storage.updateMediaItem(existingItem.id, {
                      fileSize: fileStats.size,
                      // Keep existing metadata locked
                    });
                  } else {
                    await storage.updateMediaItem(existingItem.id, mediaData);
                  }
                } else {
                  await storage.createMediaItem(mediaData);
                  newItems++;
                }
                
                processedFiles++;
              }

              // Update job progress
              await storage.updateScanJob(jobId, {
                processedFiles,
                newItems,
                errorsCount,
                currentFolder: dir,
              });

              broadcast({
                type: "scan:progress",
                data: { jobId, totalFiles, processedFiles, currentFolder: dir, newItems, errorsCount },
              });
            } catch (fileError) {
              console.error(`Error processing file ${fullPath}:`, fileError);
              errorsCount++;
              processedFiles++;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
    errorsCount++;
  }

  return { processedFiles, newItems, errorsCount };
}
