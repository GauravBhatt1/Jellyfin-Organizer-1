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
  if (!settings?.moviesDestination && !settings?.tvShowsDestination) {
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

  // Run organize in background
  runOrganize(job.id, itemIds, settings, broadcast).finally(() => {
    isOrganizing = false;
  });

  return job.id;
}

async function runOrganize(
  jobId: string,
  itemIds: string[],
  settings: { moviesDestination: string | null; tvShowsDestination: string | null; copyMode: boolean },
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
          await storage.updateMediaItem(item.id, {
            status: "organized",
            destinationPath: result.destinationPath,
          });
          
          await storage.createOrganizationLog({
            mediaItemId: item.id,
            action: settings.copyMode ? "copy" : "move",
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
      completedAt: new Date(),
    });

    broadcast({ type: "organize:done", data: { jobId, status: "completed" } });
  } catch (error) {
    console.error("Organize error:", error);
    
    await storage.updateOrganizeJob(jobId, {
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
      completedAt: new Date(),
    });

    broadcast({ type: "organize:done", data: { jobId, status: "failed" } });
  }
}

async function organizeItem(
  item: MediaItem,
  settings: { moviesDestination: string | null; tvShowsDestination: string | null; copyMode: boolean }
): Promise<{ success: boolean; destinationPath?: string; error?: string }> {
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

  // Handle collision
  destinationPath = await handleCollision(destinationPath, item);

  // Create destination directory
  const destDir = path.dirname(destinationPath);
  try {
    await fs.promises.mkdir(destDir, { recursive: true });
  } catch (error) {
    return { success: false, error: `Failed to create directory: ${error}` };
  }

  // Copy/move file atomically
  try {
    const tempPath = `${destinationPath}.tmp`;
    
    if (settings.copyMode) {
      await fs.promises.copyFile(sourcePath, tempPath);
    } else {
      try {
        await fs.promises.rename(sourcePath, tempPath);
      } catch {
        // Cross-device move - copy then delete
        await fs.promises.copyFile(sourcePath, tempPath);
        await fs.promises.unlink(sourcePath);
      }
    }
    
    // Atomic rename
    await fs.promises.rename(tempPath, destinationPath);
    
    return { success: true, destinationPath };
  } catch (error) {
    return { success: false, error: `Failed to ${settings.copyMode ? "copy" : "move"} file: ${error}` };
  }
}

async function handleCollision(destPath: string, item: MediaItem): Promise<string> {
  try {
    await fs.promises.access(destPath);
    
    // File exists - check if identical
    const existingStats = await fs.promises.stat(destPath);
    
    // Compare size
    if (existingStats.size === item.fileSize) {
      // Mark as duplicate and skip
      await storage.updateMediaItem(item.id, {
        status: "skipped",
        duplicateOf: destPath,
      });
      return destPath;
    }
    
    // Different file - auto-rename
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
        return newPath;
      }
    }
  } catch {
    // File doesn't exist - use original path
    return destPath;
  }
}
