import * as fs from "fs";
import * as path from "path";
import { storage } from "../storage";
import type { MediaItem, WSMessage } from "@shared/schema";

export type WSBroadcast = (message: WSMessage) => void;

let isOrganizing = false;

export async function startOrganize(
  itemIds: string[],
  broadcast: WSBroadcast
): Promise<string> {
  if (isOrganizing) {
    throw new Error("An organize job is already in progress");
  }

  const settings = await storage.getSettings();
  
  // Check both legacy and new array-based destinations
  const moviesPath = getDestinationPath(settings, "movies");
  const tvShowsPath = getDestinationPath(settings, "tv_shows");
  
  if (!moviesPath && !tvShowsPath) {
    throw new Error("No destination folders configured");
  }

  isOrganizing = true;

  const job = await storage.createOrganizeJob({
    status: "running",
    totalFiles: itemIds.length,
    processedFiles: 0,
    successCount: 0,
    failedCount: 0,
  });

  // Run organize in background with resolved paths
  // ALWAYS MOVE files - copy mode has been removed
  const resolvedSettings = {
    moviesDestination: moviesPath,
    tvShowsDestination: tvShowsPath,
  };
  
  runOrganize(job.id, itemIds, resolvedSettings, broadcast).finally(() => {
    isOrganizing = false;
  });

  return job.id;
}

// Helper to get destination path from settings (supports both legacy and array fields)
function getDestinationPath(
  settings: { moviesDestination?: string | null; tvShowsDestination?: string | null; moviesDestinations?: string[] | null; tvShowsDestinations?: string[] | null } | undefined,
  type: "movies" | "tv_shows"
): string | null {
  if (!settings) return null;
  
  if (type === "movies") {
    // Prefer array (first element), fallback to legacy field
    if (settings.moviesDestinations && settings.moviesDestinations.length > 0) {
      return settings.moviesDestinations[0];
    }
    return settings.moviesDestination || null;
  } else {
    if (settings.tvShowsDestinations && settings.tvShowsDestinations.length > 0) {
      return settings.tvShowsDestinations[0];
    }
    return settings.tvShowsDestination || null;
  }
}

async function runOrganize(
  jobId: string,
  itemIds: string[],
  settings: { moviesDestination: string | null; tvShowsDestination: string | null },
  broadcast: WSBroadcast
): Promise<void> {
  let processedFiles = 0;
  let successCount = 0;
  let failedCount = 0;

  try {
    for (const itemId of itemIds) {
      const item = await storage.getMediaItemById(itemId);
      if (!item) {
        failedCount++;
        processedFiles++;
        continue;
      }

      // Skip if not pending or if season pack
      if (item.status !== "pending" || item.isSeasonPack) {
        processedFiles++;
        broadcast({
          type: "organize:progress",
          data: {
            jobId,
            totalFiles: itemIds.length,
            processedFiles,
            currentFile: item.originalFilename,
            successCount,
            failedCount,
          },
        });
        continue;
      }

      try {
        const result = await organizeItem(item, settings);
        
        if (result.success) {
          // Check if this was a skipped duplicate - status already set by handleCollision
          if (result.skipped) {
            // Don't overwrite status or log a move - collision handler already set status to "skipped"
            await storage.createOrganizationLog({
              mediaItemId: item.id,
              action: "skip",
              sourcePath: path.join(item.originalPath, item.originalFilename),
              destinationPath: result.destinationPath,
              error: "Duplicate file already exists at destination",
            });
            // Count as success (duplicate handled correctly)
            successCount++;
          } else {
            // Actual successful move
            await storage.updateMediaItem(item.id, {
              status: "organized",
              destinationPath: result.destinationPath,
            });
            
            await storage.createOrganizationLog({
              mediaItemId: item.id,
              action: "move",
              sourcePath: path.join(item.originalPath, item.originalFilename),
              destinationPath: result.destinationPath,
            });
            
            // Update TV series or movie record
            if (item.detectedType === "tv_show" && item.tmdbId) {
              const existing = await storage.getTvSeriesByTmdbId(item.tmdbId);
              if (existing) {
                await storage.updateTvSeries(existing.id, {
                  episodeCount: existing.episodeCount + 1,
                });
              } else {
                await storage.createTvSeries({
                  name: item.tmdbName || item.cleanedName || item.detectedName || "Unknown",
                  tmdbId: item.tmdbId,
                  posterPath: item.posterPath,
                  episodeCount: 1,
                });
              }
            } else if (item.detectedType === "movie" && item.tmdbId) {
              const existing = await storage.getMovieByTmdbId(item.tmdbId);
              if (!existing) {
                await storage.createMovie({
                  name: item.tmdbName || item.cleanedName || item.detectedName || "Unknown",
                  year: item.year,
                  tmdbId: item.tmdbId,
                  posterPath: item.posterPath,
                });
              }
            }
            
            successCount++;
          }
        } else {
          await storage.updateMediaItem(item.id, {
            status: "error",
          });
          
          await storage.createOrganizationLog({
            mediaItemId: item.id,
            action: "error",
            sourcePath: path.join(item.originalPath, item.originalFilename),
            error: result.error,
          });
          
          failedCount++;
        }
      } catch (error) {
        console.error(`Error organizing ${item.originalFilename}:`, error);
        
        await storage.updateMediaItem(item.id, {
          status: "error",
        });
        
        await storage.createOrganizationLog({
          mediaItemId: item.id,
          action: "error",
          sourcePath: path.join(item.originalPath, item.originalFilename),
          error: error instanceof Error ? error.message : "Unknown error",
        });
        
        failedCount++;
      }

      processedFiles++;
      
      await storage.updateOrganizeJob(jobId, {
        processedFiles,
        successCount,
        failedCount,
        currentFile: item.originalFilename,
      });

      broadcast({
        type: "organize:progress",
        data: {
          jobId,
          totalFiles: itemIds.length,
          processedFiles,
          currentFile: item.originalFilename,
          successCount,
          failedCount,
        },
      });
    }

    await storage.updateOrganizeJob(jobId, {
      status: "completed",
      processedFiles,
      successCount,
      failedCount,
    });

    broadcast({ type: "organize:done", data: { jobId, status: "completed" } });
  } catch (error) {
    console.error("Organize error:", error);
    
    await storage.updateOrganizeJob(jobId, {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    broadcast({ type: "organize:done", data: { jobId, status: "failed" } });
  }
}

async function organizeItem(
  item: MediaItem,
  settings: { moviesDestination: string | null; tvShowsDestination: string | null }
): Promise<{ success: boolean; destinationPath?: string; error?: string; skipped?: boolean }> {
  const sourcePath = path.join(item.originalPath, item.originalFilename);
  
  // Check if source exists
  try {
    await fs.promises.access(sourcePath, fs.constants.R_OK);
  } catch {
    return { success: false, error: "Source file not accessible" };
  }

  let destinationPath: string;
  
  if (item.detectedType === "movie") {
    if (!settings.moviesDestination) {
      return { success: false, error: "Movies destination not configured" };
    }
    
    const name = item.tmdbName || item.cleanedName || item.detectedName || "Unknown";
    const year = item.year || "Unknown";
    const folderName = `${name} (${year})`;
    const fileName = `${name} (${year}).${item.extension}`;
    
    destinationPath = path.join(settings.moviesDestination, folderName, fileName);
  } else if (item.detectedType === "tv_show") {
    if (!settings.tvShowsDestination) {
      return { success: false, error: "TV shows destination not configured" };
    }
    
    const name = item.tmdbName || item.cleanedName || item.detectedName || "Unknown";
    const season = String(item.season ?? 1).padStart(2, "0");
    const episode = String(item.episode ?? 1).padStart(2, "0");
    const episodeEnd = item.episodeEnd ? `-E${String(item.episodeEnd).padStart(2, "0")}` : "";
    const seasonFolder = `Season ${season}`;
    const fileName = `${name} - S${season}E${episode}${episodeEnd}.${item.extension}`;
    
    destinationPath = path.join(settings.tvShowsDestination, name, seasonFolder, fileName);
  } else {
    return { success: false, error: "Unknown media type" };
  }

  // Safety guards: prevent moving to same location
  const normalizedSource = path.normalize(sourcePath);
  const normalizedDest = path.normalize(destinationPath);
  
  if (normalizedSource === normalizedDest) {
    return { success: false, error: "Source and destination are the same" };
  }
  
  // Prevent destination being inside the source file's parent directory tree
  // This blocks moves where destination folder contains the source folder
  const sourceDir = path.dirname(normalizedSource);
  if (normalizedDest.startsWith(sourceDir + path.sep) && path.dirname(normalizedDest).startsWith(sourceDir)) {
    // Only block if destination is literally inside the source directory
    // (not just sharing a prefix like /media/tv vs /media/tv_shows)
    const relPath = path.relative(sourceDir, normalizedDest);
    if (!relPath.startsWith('..') && !path.isAbsolute(relPath)) {
      return { success: false, error: "Destination is inside source directory" };
    }
  }

  // Handle collision - check if file exists and handle duplicates
  const collisionResult = await handleCollision(destinationPath, item);
  
  // If item was marked as skipped (duplicate with same size), don't move
  if (collisionResult.skipped) {
    return { success: true, destinationPath: collisionResult.path, skipped: true };
  }
  
  destinationPath = collisionResult.path;

  // Create destination directory
  const destDir = path.dirname(destinationPath);
  try {
    await fs.promises.mkdir(destDir, { recursive: true });
  } catch (error) {
    return { success: false, error: `Failed to create directory: ${error}` };
  }

  // ALWAYS MOVE file atomically (copy mode removed)
  try {
    const tempPath = `${destinationPath}.tmp`;
    
    try {
      // Try direct rename first (same filesystem)
      await fs.promises.rename(sourcePath, tempPath);
    } catch (renameError: any) {
      if (renameError.code === "EXDEV") {
        // Cross-device move: copy → verify → delete source
        await fs.promises.copyFile(sourcePath, tempPath);
        
        // Verify copy succeeded by checking file size
        const sourceStats = await fs.promises.stat(sourcePath);
        const tempStats = await fs.promises.stat(tempPath);
        
        if (sourceStats.size !== tempStats.size) {
          await fs.promises.unlink(tempPath).catch(() => {});
          return { success: false, error: "Copy verification failed - file sizes don't match" };
        }
        
        // Delete source only after verified copy
        await fs.promises.unlink(sourcePath);
      } else {
        throw renameError;
      }
    }
    
    // Atomic rename from temp to final destination
    await fs.promises.rename(tempPath, destinationPath);
    
    return { success: true, destinationPath };
  } catch (error) {
    return { success: false, error: `Failed to move file: ${error}` };
  }
}

async function handleCollision(destPath: string, item: MediaItem): Promise<{ path: string; skipped: boolean }> {
  try {
    await fs.promises.access(destPath);
    
    // File exists - check if identical
    const existingStats = await fs.promises.stat(destPath);
    
    // Compare size - if same size, treat as duplicate and skip
    if (existingStats.size === item.fileSize) {
      // Mark as duplicate and skip the move
      await storage.updateMediaItem(item.id, {
        status: "skipped",
        duplicateOf: destPath,
      });
      return { path: destPath, skipped: true };
    }
    
    // Different file - auto-rename with "(copy N)" suffix
    const ext = path.extname(destPath);
    const base = destPath.slice(0, -ext.length);
    let counter = 2;
    let newPath = `${base} (copy ${counter})${ext}`;
    
    while (true) {
      try {
        await fs.promises.access(newPath);
        counter++;
        newPath = `${base} (copy ${counter})${ext}`;
      } catch {
        return { path: newPath, skipped: false };
      }
    }
  } catch {
    // File doesn't exist - use original path
    return { path: destPath, skipped: false };
  }
}
