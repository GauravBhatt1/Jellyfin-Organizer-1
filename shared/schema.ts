import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, bigint, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Media Items Table
export const mediaItems = pgTable("media_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  originalFilename: text("original_filename").notNull(),
  originalPath: text("original_path").notNull(),
  fileSize: bigint("file_size", { mode: "number" }),
  extension: text("extension"),
  detectedType: text("detected_type").default("unknown").notNull(),
  detectedName: text("detected_name"),
  cleanedName: text("cleaned_name"),
  year: integer("year"),
  season: integer("season"),
  episode: integer("episode"),
  episodeEnd: integer("episode_end"),
  episodeTitle: text("episode_title"),
  status: text("status").default("pending").notNull(),
  destinationPath: text("destination_path"),
  confidence: integer("confidence").default(0).notNull(),
  tmdbId: integer("tmdb_id"),
  tmdbName: text("tmdb_name"),
  posterPath: text("poster_path"),
  duplicateOf: text("duplicate_of"),
  duration: integer("duration"),
  isSeasonPack: boolean("is_season_pack").default(false),
  manualOverride: boolean("manual_override").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("media_items_path_idx").on(table.originalPath, table.originalFilename),
  index("media_items_tmdb_idx").on(table.tmdbId),
  index("media_items_type_idx").on(table.detectedType),
  index("media_items_status_idx").on(table.status),
  index("media_items_duplicate_idx").on(table.duplicateOf),
]);

export const insertMediaItemSchema = createInsertSchema(mediaItems).omit({
  id: true,
  createdAt: true,
});
export type InsertMediaItem = z.infer<typeof insertMediaItemSchema>;
export type MediaItem = typeof mediaItems.$inferSelect;

// Settings Table
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tmdbApiKey: text("tmdb_api_key"),
  sourceFolders: text("source_folders").array().default(sql`'{}'::text[]`),
  moviesDestination: text("movies_destination"),
  tvShowsDestination: text("tv_shows_destination"),
  moviesDestinations: text("movies_destinations").array().default(sql`'{}'::text[]`),
  tvShowsDestinations: text("tv_shows_destinations").array().default(sql`'{}'::text[]`),
  copyMode: boolean("copy_mode").default(false).notNull(),
  autoOrganize: boolean("auto_organize").default(false).notNull(),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
});
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

// Scan Jobs Table
export const scanJobs = pgTable("scan_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  status: text("status").default("pending").notNull(),
  totalFiles: integer("total_files").default(0).notNull(),
  processedFiles: integer("processed_files").default(0).notNull(),
  newItems: integer("new_items").default(0).notNull(),
  errorsCount: integer("errors_count").default(0).notNull(),
  currentFolder: text("current_folder"),
  error: text("error"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertScanJobSchema = createInsertSchema(scanJobs).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});
export type InsertScanJob = z.infer<typeof insertScanJobSchema>;
export type ScanJob = typeof scanJobs.$inferSelect;

// Organize Jobs Table
export const organizeJobs = pgTable("organize_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  status: text("status").default("pending").notNull(),
  totalFiles: integer("total_files").default(0).notNull(),
  processedFiles: integer("processed_files").default(0).notNull(),
  successCount: integer("success_count").default(0).notNull(),
  failedCount: integer("failed_count").default(0).notNull(),
  currentFile: text("current_file"),
  error: text("error"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertOrganizeJobSchema = createInsertSchema(organizeJobs).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});
export type InsertOrganizeJob = z.infer<typeof insertOrganizeJobSchema>;
export type OrganizeJob = typeof organizeJobs.$inferSelect;

// TV Series Table
export const tvSeries = pgTable("tv_series", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  tmdbId: integer("tmdb_id"),
  posterPath: text("poster_path"),
  episodeCount: integer("episode_count").default(0).notNull(),
});

export const insertTvSeriesSchema = createInsertSchema(tvSeries).omit({
  id: true,
});
export type InsertTvSeries = z.infer<typeof insertTvSeriesSchema>;
export type TvSeries = typeof tvSeries.$inferSelect;

// Movies Table
export const movies = pgTable("movies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  year: integer("year"),
  tmdbId: integer("tmdb_id"),
  posterPath: text("poster_path"),
});

export const insertMovieSchema = createInsertSchema(movies).omit({
  id: true,
});
export type InsertMovie = z.infer<typeof insertMovieSchema>;
export type Movie = typeof movies.$inferSelect;

// Organization Logs Table
export const organizationLogs = pgTable("organization_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mediaItemId: text("media_item_id"),
  action: text("action").notNull(),
  sourcePath: text("source_path"),
  destinationPath: text("destination_path"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrganizationLogSchema = createInsertSchema(organizationLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertOrganizationLog = z.infer<typeof insertOrganizationLogSchema>;
export type OrganizationLog = typeof organizationLogs.$inferSelect;

// Stats type for dashboard
export type Stats = {
  total: number;
  organized: number;
  pending: number;
  duplicates: number;
  errors: number;
  tvShows: number;
  movies: number;
};

// Duplicate group type
export type DuplicateGroup = {
  primaryId: string;
  items: MediaItem[];
};

// WebSocket message types
export type WSMessage = 
  | { type: "scan:progress"; data: { jobId: string; totalFiles: number; processedFiles: number; currentFolder: string; newItems: number; errorsCount: number } }
  | { type: "scan:done"; data: { jobId: string; status: string } }
  | { type: "organize:progress"; data: { jobId: string; totalFiles: number; processedFiles: number; currentFile: string; successCount: number; failedCount: number } }
  | { type: "organize:done"; data: { jobId: string; status: string } };
