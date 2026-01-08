import { 
  mediaItems, settings, scanJobs, organizeJobs, tvSeries, movies, organizationLogs,
  type MediaItem, type InsertMediaItem,
  type Settings, type InsertSettings,
  type ScanJob, type InsertScanJob,
  type OrganizeJob, type InsertOrganizeJob,
  type TvSeries, type InsertTvSeries,
  type Movie, type InsertMovie,
  type OrganizationLog, type InsertOrganizationLog,
  type Stats, type DuplicateGroup
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, like, lt, isNotNull, sql, desc } from "drizzle-orm";

export interface IStorage {
  // Settings
  getSettings(): Promise<Settings | undefined>;
  upsertSettings(data: Partial<InsertSettings>): Promise<Settings>;
  
  // Media Items
  getMediaItems(filters?: {
    type?: string;
    status?: string;
    search?: string;
    confidenceBelow?: number;
    duplicatesOnly?: boolean;
  }): Promise<MediaItem[]>;
  getMediaItemById(id: string): Promise<MediaItem | undefined>;
  getMediaItemByPath(originalPath: string, originalFilename: string): Promise<MediaItem | undefined>;
  createMediaItem(item: InsertMediaItem): Promise<MediaItem>;
  updateMediaItem(id: string, data: Partial<InsertMediaItem>): Promise<MediaItem | undefined>;
  deleteMediaItem(id: string): Promise<boolean>;
  
  // Scan Jobs
  getScanJobs(limit?: number): Promise<ScanJob[]>;
  getScanJobById(id: string): Promise<ScanJob | undefined>;
  getActiveScanJob(): Promise<ScanJob | undefined>;
  createScanJob(job: InsertScanJob): Promise<ScanJob>;
  updateScanJob(id: string, data: Partial<InsertScanJob>): Promise<ScanJob | undefined>;
  
  // Organize Jobs
  getOrganizeJobs(limit?: number): Promise<OrganizeJob[]>;
  getOrganizeJobById(id: string): Promise<OrganizeJob | undefined>;
  getActiveOrganizeJob(): Promise<OrganizeJob | undefined>;
  createOrganizeJob(job: InsertOrganizeJob): Promise<OrganizeJob>;
  updateOrganizeJob(id: string, data: Partial<InsertOrganizeJob>): Promise<OrganizeJob | undefined>;
  
  // TV Series
  getTvSeries(): Promise<TvSeries[]>;
  getTvSeriesById(id: string): Promise<TvSeries | undefined>;
  getTvSeriesByTmdbId(tmdbId: number): Promise<TvSeries | undefined>;
  createTvSeries(series: InsertTvSeries): Promise<TvSeries>;
  updateTvSeries(id: string, data: Partial<InsertTvSeries>): Promise<TvSeries | undefined>;
  
  // Movies
  getMovies(): Promise<Movie[]>;
  getMovieById(id: string): Promise<Movie | undefined>;
  getMovieByTmdbId(tmdbId: number): Promise<Movie | undefined>;
  createMovie(movie: InsertMovie): Promise<Movie>;
  updateMovie(id: string, data: Partial<InsertMovie>): Promise<Movie | undefined>;
  
  // Organization Logs
  createOrganizationLog(log: InsertOrganizationLog): Promise<OrganizationLog>;
  getOrganizationLogs(limit?: number): Promise<OrganizationLog[]>;
  
  // Stats
  getStats(): Promise<Stats>;
  
  // Duplicates
  getDuplicateGroups(): Promise<DuplicateGroup[]>;
}

export class DatabaseStorage implements IStorage {
  // Settings
  async getSettings(): Promise<Settings | undefined> {
    const [result] = await db.select().from(settings).limit(1);
    return result || undefined;
  }

  async upsertSettings(data: Partial<InsertSettings>): Promise<Settings> {
    const existing = await this.getSettings();
    if (existing) {
      const [updated] = await db
        .update(settings)
        .set(data)
        .where(eq(settings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(settings)
        .values(data as InsertSettings)
        .returning();
      return created;
    }
  }

  // Media Items
  async getMediaItems(filters?: {
    type?: string;
    status?: string;
    search?: string;
    confidenceBelow?: number;
    duplicatesOnly?: boolean;
  }): Promise<MediaItem[]> {
    let query = db.select().from(mediaItems);
    const conditions = [];

    if (filters?.type && filters.type !== "all") {
      conditions.push(eq(mediaItems.detectedType, filters.type));
    }
    if (filters?.status && filters.status !== "all") {
      conditions.push(eq(mediaItems.status, filters.status));
    }
    if (filters?.search) {
      conditions.push(
        or(
          like(mediaItems.originalFilename, `%${filters.search}%`),
          like(mediaItems.cleanedName, `%${filters.search}%`),
          like(mediaItems.tmdbName, `%${filters.search}%`)
        )
      );
    }
    if (filters?.confidenceBelow) {
      conditions.push(lt(mediaItems.confidence, filters.confidenceBelow));
    }
    if (filters?.duplicatesOnly) {
      conditions.push(isNotNull(mediaItems.duplicateOf));
    }

    if (conditions.length > 0) {
      return db.select().from(mediaItems).where(and(...conditions)).orderBy(desc(mediaItems.createdAt));
    }
    
    return db.select().from(mediaItems).orderBy(desc(mediaItems.createdAt));
  }

  async getMediaItemById(id: string): Promise<MediaItem | undefined> {
    const [result] = await db.select().from(mediaItems).where(eq(mediaItems.id, id));
    return result || undefined;
  }

  async getMediaItemByPath(originalPath: string, originalFilename: string): Promise<MediaItem | undefined> {
    const [result] = await db
      .select()
      .from(mediaItems)
      .where(and(
        eq(mediaItems.originalPath, originalPath),
        eq(mediaItems.originalFilename, originalFilename)
      ));
    return result || undefined;
  }

  async createMediaItem(item: InsertMediaItem): Promise<MediaItem> {
    const [created] = await db.insert(mediaItems).values(item).returning();
    return created;
  }

  async updateMediaItem(id: string, data: Partial<InsertMediaItem>): Promise<MediaItem | undefined> {
    const [updated] = await db
      .update(mediaItems)
      .set(data)
      .where(eq(mediaItems.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteMediaItem(id: string): Promise<boolean> {
    const result = await db.delete(mediaItems).where(eq(mediaItems.id, id));
    return true;
  }

  // Scan Jobs
  async getScanJobs(limit = 10): Promise<ScanJob[]> {
    return db.select().from(scanJobs).orderBy(desc(scanJobs.startedAt)).limit(limit);
  }

  async getScanJobById(id: string): Promise<ScanJob | undefined> {
    const [result] = await db.select().from(scanJobs).where(eq(scanJobs.id, id));
    return result || undefined;
  }

  async getActiveScanJob(): Promise<ScanJob | undefined> {
    const [result] = await db
      .select()
      .from(scanJobs)
      .where(or(eq(scanJobs.status, "pending"), eq(scanJobs.status, "running")));
    return result || undefined;
  }

  async createScanJob(job: InsertScanJob): Promise<ScanJob> {
    const [created] = await db.insert(scanJobs).values(job).returning();
    return created;
  }

  async updateScanJob(id: string, data: Partial<InsertScanJob>): Promise<ScanJob | undefined> {
    const [updated] = await db
      .update(scanJobs)
      .set(data)
      .where(eq(scanJobs.id, id))
      .returning();
    return updated || undefined;
  }

  // Organize Jobs
  async getOrganizeJobs(limit = 10): Promise<OrganizeJob[]> {
    return db.select().from(organizeJobs).orderBy(desc(organizeJobs.startedAt)).limit(limit);
  }

  async getOrganizeJobById(id: string): Promise<OrganizeJob | undefined> {
    const [result] = await db.select().from(organizeJobs).where(eq(organizeJobs.id, id));
    return result || undefined;
  }

  async getActiveOrganizeJob(): Promise<OrganizeJob | undefined> {
    const [result] = await db
      .select()
      .from(organizeJobs)
      .where(or(eq(organizeJobs.status, "pending"), eq(organizeJobs.status, "running")));
    return result || undefined;
  }

  async createOrganizeJob(job: InsertOrganizeJob): Promise<OrganizeJob> {
    const [created] = await db.insert(organizeJobs).values(job).returning();
    return created;
  }

  async updateOrganizeJob(id: string, data: Partial<InsertOrganizeJob>): Promise<OrganizeJob | undefined> {
    const [updated] = await db
      .update(organizeJobs)
      .set(data)
      .where(eq(organizeJobs.id, id))
      .returning();
    return updated || undefined;
  }

  // TV Series
  async getTvSeries(): Promise<TvSeries[]> {
    return db.select().from(tvSeries);
  }

  async getTvSeriesById(id: string): Promise<TvSeries | undefined> {
    const [result] = await db.select().from(tvSeries).where(eq(tvSeries.id, id));
    return result || undefined;
  }

  async getTvSeriesByTmdbId(tmdbId: number): Promise<TvSeries | undefined> {
    const [result] = await db.select().from(tvSeries).where(eq(tvSeries.tmdbId, tmdbId));
    return result || undefined;
  }

  async createTvSeries(series: InsertTvSeries): Promise<TvSeries> {
    const [created] = await db.insert(tvSeries).values(series).returning();
    return created;
  }

  async updateTvSeries(id: string, data: Partial<InsertTvSeries>): Promise<TvSeries | undefined> {
    const [updated] = await db
      .update(tvSeries)
      .set(data)
      .where(eq(tvSeries.id, id))
      .returning();
    return updated || undefined;
  }

  // Movies
  async getMovies(): Promise<Movie[]> {
    return db.select().from(movies);
  }

  async getMovieById(id: string): Promise<Movie | undefined> {
    const [result] = await db.select().from(movies).where(eq(movies.id, id));
    return result || undefined;
  }

  async getMovieByTmdbId(tmdbId: number): Promise<Movie | undefined> {
    const [result] = await db.select().from(movies).where(eq(movies.tmdbId, tmdbId));
    return result || undefined;
  }

  async createMovie(movie: InsertMovie): Promise<Movie> {
    const [created] = await db.insert(movies).values(movie).returning();
    return created;
  }

  async updateMovie(id: string, data: Partial<InsertMovie>): Promise<Movie | undefined> {
    const [updated] = await db
      .update(movies)
      .set(data)
      .where(eq(movies.id, id))
      .returning();
    return updated || undefined;
  }

  // Organization Logs
  async createOrganizationLog(log: InsertOrganizationLog): Promise<OrganizationLog> {
    const [created] = await db.insert(organizationLogs).values(log).returning();
    return created;
  }

  async getOrganizationLogs(limit = 50): Promise<OrganizationLog[]> {
    return db.select().from(organizationLogs).orderBy(desc(organizationLogs.createdAt)).limit(limit);
  }

  // Stats
  async getStats(): Promise<Stats> {
    const allItems = await db.select().from(mediaItems);
    
    const total = allItems.length;
    const organized = allItems.filter(i => i.status === "organized").length;
    const pending = allItems.filter(i => i.status === "pending").length;
    const duplicates = allItems.filter(i => i.duplicateOf !== null).length;
    const errors = allItems.filter(i => i.status === "error").length;
    
    // Count unique TV series - prefer tv_series table, else count distinct names
    const tvSeriesFromTable = await db.select().from(tvSeries);
    let tvShowsCount: number;
    if (tvSeriesFromTable.length > 0) {
      tvShowsCount = tvSeriesFromTable.length;
    } else {
      // Count distinct series names from media items
      const tvItems = allItems.filter(i => i.detectedType === "tv_show");
      const uniqueSeriesNames = new Set<string>();
      for (const item of tvItems) {
        const name = (item.tmdbName || item.detectedName || "").trim();
        if (name) {
          uniqueSeriesNames.add(name.toLowerCase());
        }
      }
      tvShowsCount = uniqueSeriesNames.size;
    }
    
    // Count unique movies - prefer movies table, else count distinct names
    const moviesFromTable = await db.select().from(movies);
    let moviesCount: number;
    if (moviesFromTable.length > 0) {
      moviesCount = moviesFromTable.length;
    } else {
      // Count distinct movie names from media items
      const movieItems = allItems.filter(i => i.detectedType === "movie");
      const uniqueMovieNames = new Set<string>();
      for (const item of movieItems) {
        const name = (item.tmdbName || item.detectedName || "").trim();
        if (name) {
          uniqueMovieNames.add(name.toLowerCase());
        }
      }
      moviesCount = uniqueMovieNames.size;
    }

    return {
      total,
      organized,
      pending,
      duplicates,
      errors,
      tvShows: tvShowsCount,
      movies: moviesCount,
    };
  }

  // Duplicates
  async getDuplicateGroups(): Promise<DuplicateGroup[]> {
    const allItems = await db.select().from(mediaItems);
    
    const groups = new Map<string, MediaItem[]>();
    
    for (const item of allItems) {
      if (item.duplicateOf) {
        const existing = groups.get(item.duplicateOf) || [];
        existing.push(item);
        groups.set(item.duplicateOf, existing);
      }
    }
    
    const result: DuplicateGroup[] = [];
    for (const [primaryId, duplicateItems] of Array.from(groups.entries())) {
      const primary = allItems.find(i => i.id === primaryId);
      if (primary) {
        result.push({
          primaryId,
          items: [primary, ...duplicateItems],
        });
      }
    }
    
    return result;
  }
}

export const storage = new DatabaseStorage();
