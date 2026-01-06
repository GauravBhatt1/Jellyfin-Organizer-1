export interface ParsedMedia {
  cleanedName: string;
  detectedType: "movie" | "tv_show" | "unknown";
  detectedName: string | null;
  year: number | null;
  season: number | null;
  episode: number | null;
  episodeEnd: number | null;
  isSeasonPack: boolean;
  confidence: number;
}

const SUPPORTED_EXTENSIONS = ["mkv", "mp4", "avi", "mov", "wmv", "flv", "webm", "m4v", "ts", "m2ts"];

const RELEASE_TAGS = [
  "yify", "rarbg", "x264", "x265", "hevc", "bluray", "web-dl", "webrip", "hdr", 
  "dv", "aac", "720p", "1080p", "2160p", "4k", "uhd", "brrip", "bdrip", "dvdrip",
  "hdtv", "proper", "repack", "extended", "unrated", "directors cut", "theatrical",
  "remux", "atmos", "dts", "truehd", "ac3", "5.1", "7.1", "10bit", "hdr10", "dolby vision",
  "amzn", "nf", "hulu", "dsnp", "hmax", "atvp", "pcok", "criterion"
];

const GENERIC_FOLDER_NAMES = [
  "ubuntu", "home", "cloud", "downloads", "media", "video", "tv", "movies",
  "series", "shows", "films", "content", "library", "storage", "data", "new",
  "temp", "tmp", "share", "shared", "public", "private", "complete", "completed"
];

// TV patterns
const TV_PATTERNS = [
  // S01E01, S01.E01, S01-E01
  /\b[sS](\d{1,2})[\.\-\s]*[eE][pP]?\s*(\d{1,3})(?:[\-eE]+(\d{1,3}))?\b/,
  // S01E01E02
  /\b[sS](\d{1,2})[eE](\d{1,3})[eE](\d{1,3})\b/,
  // S01E01-03
  /\b[sS](\d{1,2})[eE](\d{1,3})\-(\d{1,3})\b/,
  // S04 EP 01
  /\b[sS](\d{1,2})\s+[eE][pP]\s*(\d{1,3})\b/,
  // 1x01, 01x01
  /\b(\d{1,2})[xX](\d{1,3})(?:\-(\d{1,3}))?\b/,
  // Season 1 Episode 1
  /\bseason\s*(\d{1,2})\s*episode\s*(\d{1,3})\b/i,
];

// Season pack patterns
const SEASON_PACK_PATTERNS = [
  /\bseason\s*(\d{1,2})\b/i,
  /\bcomplete\s*season\s*(\d{1,2})?\b/i,
  /\bseason\s*(one|two|three|four|five|six|seven|eight|nine|ten)\b/i,
  /\bs(\d{1,2})\b(?!.*[eE]\d)/,
];

// Special episode patterns
const SPECIAL_PATTERNS = [
  /\bspecial\b/i,
  /\bova\b/i,
  /\bepisode\s*0\b/i,
  /\bs00[eE](\d{1,3})\b/,
];

// Movie year patterns
const YEAR_PATTERNS = [
  /\((\d{4})\)/,
  /\[(\d{4})\]/,
  /\b(19\d{2}|20\d{2})\b/,
];

export function isSupportedExtension(ext: string): boolean {
  return SUPPORTED_EXTENSIONS.includes(ext.toLowerCase().replace(".", ""));
}

export function parseFilename(filename: string, parentFolder?: string): ParsedMedia {
  let confidence = 0;
  
  // Step 1: Remove extension
  const ext = filename.slice(filename.lastIndexOf(".") + 1);
  let name = filename.slice(0, filename.lastIndexOf("."));
  
  // Step 2: Replace dots/underscores/hyphens with spaces
  name = name.replace(/[\._\-]/g, " ");
  
  // Step 3: Unicode normalize NFKD
  name = name.normalize("NFKD");
  
  // Step 4 & 5: Trim whitespace and prepare for matching
  name = name.trim();
  const lowerName = name.toLowerCase();
  
  // Store cleaned name before removing release tags
  let cleanedName = name;
  
  // Remove release tags
  for (const tag of RELEASE_TAGS) {
    const regex = new RegExp(`\\b${tag}\\b`, "gi");
    cleanedName = cleanedName.replace(regex, "");
  }
  cleanedName = cleanedName.replace(/\s+/g, " ").trim();
  
  // Parse TV show patterns
  let season: number | null = null;
  let episode: number | null = null;
  let episodeEnd: number | null = null;
  let isSeasonPack = false;
  let detectedType: "movie" | "tv_show" | "unknown" = "unknown";
  let detectedName: string | null = null;
  
  // Check for special episodes first
  for (const pattern of SPECIAL_PATTERNS) {
    if (pattern.test(lowerName)) {
      season = 0;
      const match = name.match(/[eE][pP]?\s*(\d{1,3})/);
      if (match) {
        episode = parseInt(match[1]);
      }
      detectedType = "tv_show";
      confidence += 30;
      break;
    }
  }
  
  // Check for regular TV patterns
  if (detectedType !== "tv_show") {
    for (const pattern of TV_PATTERNS) {
      const match = name.match(pattern);
      if (match) {
        season = parseInt(match[1]);
        episode = parseInt(match[2]);
        if (match[3]) {
          episodeEnd = parseInt(match[3]);
        }
        detectedType = "tv_show";
        confidence += 40;
        
        // Extract series name (everything before the pattern)
        const patternIndex = name.search(pattern);
        if (patternIndex > 0) {
          let seriesName = name.slice(0, patternIndex).trim();
          // Remove release tags from series name
          for (const tag of RELEASE_TAGS) {
            const regex = new RegExp(`\\b${tag}\\b`, "gi");
            seriesName = seriesName.replace(regex, "");
          }
          detectedName = seriesName.replace(/\s+/g, " ").trim();
        }
        break;
      }
    }
  }
  
  // Check for season packs
  if (detectedType !== "tv_show") {
    for (const pattern of SEASON_PACK_PATTERNS) {
      const match = name.match(pattern);
      if (match) {
        isSeasonPack = true;
        detectedType = "tv_show";
        confidence += 20;
        if (match[1]) {
          const seasonNum = match[1];
          if (/^\d+$/.test(seasonNum)) {
            season = parseInt(seasonNum);
          } else {
            // Convert word to number
            const wordToNum: Record<string, number> = {
              one: 1, two: 2, three: 3, four: 4, five: 5,
              six: 6, seven: 7, eight: 8, nine: 9, ten: 10
            };
            season = wordToNum[seasonNum.toLowerCase()] || null;
          }
        }
        break;
      }
    }
  }
  
  // Check for movie year patterns if not a TV show
  let year: number | null = null;
  if (detectedType !== "tv_show") {
    for (const pattern of YEAR_PATTERNS) {
      const match = name.match(pattern);
      if (match) {
        const potentialYear = parseInt(match[1]);
        if (potentialYear >= 1900 && potentialYear <= new Date().getFullYear() + 1) {
          year = potentialYear;
          detectedType = "movie";
          confidence += 40;
          
          // Extract movie name (everything before the year)
          const yearIndex = name.indexOf(match[0]);
          if (yearIndex > 0) {
            let movieName = name.slice(0, yearIndex).trim();
            for (const tag of RELEASE_TAGS) {
              const regex = new RegExp(`\\b${tag}\\b`, "gi");
              movieName = movieName.replace(regex, "");
            }
            detectedName = movieName.replace(/\s+/g, " ").trim();
          }
          break;
        }
      }
    }
  }
  
  // Add confidence for valid year
  if (year) {
    confidence += 20;
  }
  
  // If no name detected, try parent folder
  if (!detectedName && parentFolder) {
    const folderLower = parentFolder.toLowerCase();
    if (!GENERIC_FOLDER_NAMES.includes(folderLower)) {
      detectedName = parentFolder;
      confidence += 10;
    } else {
      confidence -= 30;
    }
  }
  
  // If still no name, use cleaned name
  if (!detectedName) {
    detectedName = cleanedName;
    confidence -= 10;
  }
  
  // Cap confidence at 100
  confidence = Math.min(100, Math.max(0, confidence));
  
  return {
    cleanedName,
    detectedType,
    detectedName,
    year,
    season,
    episode,
    episodeEnd,
    isSeasonPack,
    confidence,
  };
}

// Test cases for the filename parser
export const testCases = [
  { input: "Breaking.Bad.S01E01.720p.BluRay.x264-DEMAND.mkv", expected: { type: "tv_show", season: 1, episode: 1 } },
  { input: "The.Office.US.S04.EP.01.1080p.WEB-DL.mkv", expected: { type: "tv_show", season: 4, episode: 1 } },
  { input: "Game of Thrones - 1x01 - Winter Is Coming.mp4", expected: { type: "tv_show", season: 1, episode: 1 } },
  { input: "Friends.S01E01E02.720p.mkv", expected: { type: "tv_show", season: 1, episode: 1, episodeEnd: 2 } },
  { input: "Stranger.Things.S04E01-03.2160p.mkv", expected: { type: "tv_show", season: 4, episode: 1, episodeEnd: 3 } },
  { input: "The.Matrix.(1999).1080p.BluRay.mkv", expected: { type: "movie", year: 1999 } },
  { input: "Inception.2010.2160p.UHD.BluRay.mkv", expected: { type: "movie", year: 2010 } },
  { input: "Complete Season 01 - House MD.mkv", expected: { type: "tv_show", isSeasonPack: true, season: 1 } },
  { input: "Naruto - Special - OVA.mkv", expected: { type: "tv_show", season: 0 } },
  { input: "random_video_file.mkv", expected: { type: "unknown" } },
];

export function runTests(): { passed: number; failed: number; results: any[] } {
  let passed = 0;
  let failed = 0;
  const results: any[] = [];
  
  for (const test of testCases) {
    const result = parseFilename(test.input);
    let success = true;
    
    if (test.expected.type && result.detectedType !== test.expected.type) success = false;
    if (test.expected.season !== undefined && result.season !== test.expected.season) success = false;
    if (test.expected.episode !== undefined && result.episode !== test.expected.episode) success = false;
    if (test.expected.episodeEnd !== undefined && result.episodeEnd !== test.expected.episodeEnd) success = false;
    if (test.expected.year !== undefined && result.year !== test.expected.year) success = false;
    if (test.expected.isSeasonPack !== undefined && result.isSeasonPack !== test.expected.isSeasonPack) success = false;
    
    if (success) {
      passed++;
    } else {
      failed++;
    }
    
    results.push({
      input: test.input,
      expected: test.expected,
      actual: {
        type: result.detectedType,
        season: result.season,
        episode: result.episode,
        episodeEnd: result.episodeEnd,
        year: result.year,
        isSeasonPack: result.isSeasonPack,
        confidence: result.confidence,
      },
      success,
    });
  }
  
  return { passed, failed, results };
}
