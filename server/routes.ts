import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { startScan } from "./lib/scanner";
import { startOrganize } from "./lib/organizer";
import { runTests } from "./lib/filename-parser";
import { insertMediaItemSchema, insertSettingsSchema } from "@shared/schema";
import type { WSMessage } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";

const ALLOWED_ROOTS = ["/", "/host", "/mnt", "/media", "/home", "/data", "/opt", "/srv", "/storage", "/nas", "/volume1", "/shares"];

function isPathAllowed(targetPath: string): boolean {
  const normalized = path.resolve(targetPath);
  return ALLOWED_ROOTS.some(root => normalized === root || normalized.startsWith(root + "/"));
}

function getAvailableRoots(): { name: string; path: string; exists: boolean }[] {
  return ALLOWED_ROOTS.map(root => ({
    name: root,
    path: root,
    exists: fs.existsSync(root)
  })).filter(r => r.exists);
}

const clients = new Set<WebSocket>();

function broadcast(message: WSMessage): void {
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Initialize WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    clients.add(ws);
    console.log("WebSocket client connected");

    ws.on("close", () => {
      clients.delete(ws);
      console.log("WebSocket client disconnected");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      clients.delete(ws);
    });
  });

  // Settings endpoints
  app.get("/api/settings", async (req: Request, res: Response) => {
    try {
      let settings = await storage.getSettings();
      if (!settings) {
        // Create default settings
        settings = await storage.upsertSettings({
          sourceFolders: [],
          copyMode: true,
          autoOrganize: false,
        });
      }
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", async (req: Request, res: Response) => {
    try {
      // Validate with partial schema (all fields optional for updates)
      const parsed = insertSettingsSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid settings data", details: parsed.error });
      }
      
      // Sync legacy fields with array fields for backward compatibility
      const data = { ...parsed.data };
      
      // Sync moviesDestinations array with legacy field
      if (data.moviesDestinations !== undefined) {
        if (data.moviesDestinations && data.moviesDestinations.length > 0) {
          data.moviesDestination = data.moviesDestinations[0];
        } else {
          // Empty array means clear destination
          data.moviesDestination = null;
        }
      }
      // Sync tvShowsDestinations array with legacy field
      if (data.tvShowsDestinations !== undefined) {
        if (data.tvShowsDestinations && data.tvShowsDestinations.length > 0) {
          data.tvShowsDestination = data.tvShowsDestinations[0];
        } else {
          // Empty array means clear destination
          data.tvShowsDestination = null;
        }
      }
      
      const settings = await storage.upsertSettings(data);
      res.json(settings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Media items endpoints
  app.get("/api/media-items", async (req: Request, res: Response) => {
    try {
      const { type, status, search, confidenceBelow, duplicatesOnly } = req.query;
      const items = await storage.getMediaItems({
        type: type as string,
        status: status as string,
        search: search as string,
        confidenceBelow: confidenceBelow ? parseInt(confidenceBelow as string) : undefined,
        duplicatesOnly: duplicatesOnly === "true",
      });
      res.json(items);
    } catch (error) {
      console.error("Error fetching media items:", error);
      res.status(500).json({ error: "Failed to fetch media items" });
    }
  });

  app.post("/api/media-items", async (req: Request, res: Response) => {
    try {
      const parsed = insertMediaItemSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error });
      }
      const item = await storage.createMediaItem(parsed.data);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating media item:", error);
      res.status(500).json({ error: "Failed to create media item" });
    }
  });

  app.patch("/api/media-items/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const item = await storage.updateMediaItem(id, req.body);
      if (!item) {
        return res.status(404).json({ error: "Media item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error updating media item:", error);
      res.status(500).json({ error: "Failed to update media item" });
    }
  });

  app.delete("/api/media-items/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteMediaItem(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting media item:", error);
      res.status(500).json({ error: "Failed to delete media item" });
    }
  });

  // Scan endpoints
  app.post("/api/scan", async (req: Request, res: Response) => {
    try {
      const jobId = await startScan(broadcast);
      const job = await storage.getScanJobById(jobId);
      res.status(201).json(job);
    } catch (error) {
      console.error("Error starting scan:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to start scan" });
    }
  });

  app.get("/api/scan/recent", async (req: Request, res: Response) => {
    try {
      const jobs = await storage.getScanJobs(10);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching scan jobs:", error);
      res.status(500).json({ error: "Failed to fetch scan jobs" });
    }
  });

  app.get("/api/scan/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const job = await storage.getScanJobById(id);
      if (!job) {
        return res.status(404).json({ error: "Scan job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error fetching scan job:", error);
      res.status(500).json({ error: "Failed to fetch scan job" });
    }
  });

  // Organize endpoints
  app.post("/api/organize", async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "No item IDs provided" });
      }
      const jobId = await startOrganize(ids, broadcast);
      const job = await storage.getOrganizeJobById(jobId);
      res.status(201).json(job);
    } catch (error) {
      console.error("Error starting organize:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to start organize" });
    }
  });

  app.get("/api/organize/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const job = await storage.getOrganizeJobById(id);
      if (!job) {
        return res.status(404).json({ error: "Organize job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error fetching organize job:", error);
      res.status(500).json({ error: "Failed to fetch organize job" });
    }
  });

  // Duplicates endpoint
  app.get("/api/duplicates", async (req: Request, res: Response) => {
    try {
      const groups = await storage.getDuplicateGroups();
      res.json(groups);
    } catch (error) {
      console.error("Error fetching duplicates:", error);
      res.status(500).json({ error: "Failed to fetch duplicates" });
    }
  });

  // Stats endpoint
  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // TV Series endpoint
  app.get("/api/tv-series", async (req: Request, res: Response) => {
    try {
      const series = await storage.getTvSeries();
      res.json(series);
    } catch (error) {
      console.error("Error fetching TV series:", error);
      res.status(500).json({ error: "Failed to fetch TV series" });
    }
  });

  // Movies endpoint
  app.get("/api/movies", async (req: Request, res: Response) => {
    try {
      const movies = await storage.getMovies();
      res.json(movies);
    } catch (error) {
      console.error("Error fetching movies:", error);
      res.status(500).json({ error: "Failed to fetch movies" });
    }
  });

  // Filename parser tests endpoint (for verification)
  app.get("/api/parser-tests", async (req: Request, res: Response) => {
    try {
      const results = runTests();
      res.json(results);
    } catch (error) {
      console.error("Error running parser tests:", error);
      res.status(500).json({ error: "Failed to run parser tests" });
    }
  });

  // Organization logs endpoint
  app.get("/api/organization-logs", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getOrganizationLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching organization logs:", error);
      res.status(500).json({ error: "Failed to fetch organization logs" });
    }
  });

  // Rescan single item endpoint
  app.post("/api/media-items/:id/rescan", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const item = await storage.getMediaItemById(id);
      if (!item) {
        return res.status(404).json({ error: "Media item not found" });
      }
      
      // Reset the item to pending state for next scan
      const updated = await storage.updateMediaItem(id, {
        status: "pending",
        manualOverride: false,
        tmdbId: null,
        tmdbName: null,
        posterPath: null,
        duplicateOf: null,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error marking item for rescan:", error);
      res.status(500).json({ error: "Failed to mark item for rescan" });
    }
  });

  // Undo/rollback organized file
  app.post("/api/media-items/:id/undo", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const item = await storage.getMediaItemById(id);
      if (!item) {
        return res.status(404).json({ error: "Media item not found" });
      }
      
      if (item.status !== "organized" || !item.destinationPath) {
        return res.status(400).json({ error: "Item is not organized or has no destination path" });
      }
      
      const originalPath = path.join(item.originalPath, item.originalFilename);
      
      // Check if destination file exists
      if (!fs.existsSync(item.destinationPath)) {
        return res.status(400).json({ error: "Destination file no longer exists" });
      }
      
      // Create original directory if needed
      await fs.promises.mkdir(item.originalPath, { recursive: true });
      
      // Move file back
      try {
        await fs.promises.rename(item.destinationPath, originalPath);
      } catch {
        // Cross-device move
        await fs.promises.copyFile(item.destinationPath, originalPath);
        await fs.promises.unlink(item.destinationPath);
      }
      
      // Update item status back to pending
      const updated = await storage.updateMediaItem(id, {
        status: "pending",
        destinationPath: null,
      });
      
      // Log the undo action (use "move" since we're moving file back)
      await storage.createOrganizationLog({
        mediaItemId: id,
        action: "move",
        sourcePath: item.destinationPath,
        destinationPath: originalPath,
        error: "Undo operation - file moved back to original location",
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error undoing organize:", error);
      res.status(500).json({ error: "Failed to undo organize" });
    }
  });

  // Filesystem browsing endpoints
  app.get("/api/filesystem/roots", async (req: Request, res: Response) => {
    try {
      const roots = getAvailableRoots();
      res.json(roots);
    } catch (error) {
      console.error("Error getting filesystem roots:", error);
      res.status(500).json({ error: "Failed to get filesystem roots" });
    }
  });

  app.get("/api/filesystem", async (req: Request, res: Response) => {
    try {
      const targetPath = (req.query.path as string) || "/";
      const normalized = path.resolve(targetPath);

      // Check if path is in allowed roots
      if (!isPathAllowed(normalized)) {
        return res.status(403).json({ error: "Access denied to this path" });
      }

      // Check if path exists
      if (!fs.existsSync(normalized)) {
        return res.status(404).json({ error: "Path not found" });
      }

      const stats = fs.statSync(normalized);
      if (!stats.isDirectory()) {
        return res.status(400).json({ error: "Path is not a directory" });
      }

      // Read directory contents
      const items = fs.readdirSync(normalized, { withFileTypes: true });
      const folders = items
        .filter(item => item.isDirectory() && !item.name.startsWith("."))
        .map(item => ({
          name: item.name,
          path: path.join(normalized, item.name),
          type: "directory" as const
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      res.json({
        currentPath: normalized,
        parentPath: path.dirname(normalized) !== normalized ? path.dirname(normalized) : null,
        canGoUp: path.dirname(normalized) !== normalized && isPathAllowed(path.dirname(normalized)),
        items: folders
      });
    } catch (error) {
      console.error("Error browsing filesystem:", error);
      res.status(500).json({ error: "Failed to browse filesystem" });
    }
  });

  return httpServer;
}
