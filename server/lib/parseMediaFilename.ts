import * as path from "path";

export interface ParsedMediaResult {
  cleanedName: string;
  detectedType: "movie" | "tv_show" | "unknown";
  detectedName: string | null;
  year: number | null;
  season: number | null;
  episode: number | null;
  episodeEnd: number | null;
  isSeasonPack: boolean;
  confidence: number;
  seasonFolder: string | null;
  destinationFilename: string | null;
}

const SUPPORTED_EXTENSIONS = ["mkv", "mp4", "avi", "mov", "wmv", "flv", "webm", "m4v", "ts", "m2ts"];

const NOISE_TOKENS = new Set([
  "480p", "720p", "1080p", "2160p", "4k", "uhd",
  "web-dl", "webdl", "webrip", "web", "hdrip", "bluray", "bdrip", "brrip", "dvdrip", "hdtv", "dvdscr", "cam", "ts", "tc", "r5", "scr",
  "x264", "x265", "h264", "h265", "hevc", "avc", "xvid", "divx", "10bit", "8bit",
  "aac", "ac3", "dts", "ddp", "dd5", "atmos", "truehd", "flac", "mp3", "eac3",
  "5.1", "7.1", "2.0", "2.1", "6.1",
  "hindi", "english", "tamil", "telugu", "bengali", "malayalam", "kannada", "marathi", "punjabi", "gujarati",
  "korean", "japanese", "chinese", "spanish", "french", "german", "italian", "portuguese", "russian", "arabic", "dutch", "polish", "turkish", "thai", "vietnamese", "indonesian",
  "dual", "multi", "esub", "esubs", "subs", "subtitle", "subtitles", "sub", "eng", "hin", "tam", "tel",
  "yify", "yts", "rarbg", "ettv", "eztv", "hdhub4u", "galaxy", "psa", "mkvcage", "tamilrockers", "shaanig", "pahe", "amzn", "nf", "netflix", "hulu", "dsnp", "hmax", "atvp", "pcok", "apdl", "criterion", "mzabi", "repack", "proper", "extended", "unrated", "directors", "cut", "theatrical", "remux", "imax", "hdr", "hdr10", "dv", "dolby", "vision", "sdr",
  "ms", "mr", "dr"
]);

const GENERIC_FOLDER_NAMES = new Set([
  "ubuntu", "home", "cloud", "downloads", "media", "video", "tv", "movies", "television",
  "series", "shows", "films", "content", "library", "storage", "data", "new",
  "temp", "tmp", "share", "shared", "public", "private", "complete", "completed",
  "season", "seasons", "episode", "episodes", "videos", "torrents", "incoming"
]);

const TV_PATTERNS = [
  /\b[sS](\d{1,2})\s*[eE][pP]?\s*(\d{1,3})(?:[\-eE]+(\d{1,3}))?\b/,
  /\b[sS](\d{1,2})[eE](\d{1,3})[eE](\d{1,3})\b/,
  /\b[sS](\d{1,2})[eE](\d{1,3})\-(\d{1,3})\b/,
  /\b[sS](\d{1,2})\s+[eE][pP]\s*(\d{1,3})\b/,
  /\b(\d{1,2})[xX](\d{1,3})(?:\-(\d{1,3}))?\b/,
  /\bseason\s*(\d{1,2})\s*episode\s*(\d{1,3})\b/i,
];

const SEASON_PACK_PATTERNS = [
  /\bseason\s*(\d{1,2})\b/i,
  /\bcomplete\s*season\s*(\d{1,2})?\b/i,
  /\bseason\s*(one|two|three|four|five|six|seven|eight|nine|ten)\b/i,
  /\bs(\d{1,2})\b(?!.*[eE]\d)/,
];

const SPECIAL_PATTERNS = [
  /\bspecial\b/i,
  /\bova\b/i,
  /\bepisode\s*0\b/i,
  /\bs00[eE](\d{1,3})\b/,
];

const YEAR_PATTERNS = [
  /\((\d{4})\)/,
  /\[(\d{4})\]/,
  /\b(19\d{2}|20\d{2})\b/,
];

export function isSupportedExtension(ext: string): boolean {
  return SUPPORTED_EXTENSIONS.includes(ext.toLowerCase().replace(".", ""));
}

function normalizeFilename(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf(".") + 1);
  let name = filename.slice(0, filename.lastIndexOf("."));
  
  name = name.replace(/[\._\-]/g, " ");
  name = name.normalize("NFKD");
  name = name.replace(/\s+/g, " ");
  name = name.trim();
  
  return name;
}

function removeNoise(text: string): string {
  let cleaned = text.replace(/\[.*?\]/g, " ");
  cleaned = cleaned.replace(/\((?![12]\d{3}\))[^)]*\)/g, " ");
  
  const tokens = cleaned.split(/\s+/);
  const filteredTokens: string[] = [];
  
  for (const token of tokens) {
    const lowerToken = token.toLowerCase().replace(/[^a-z0-9.]/g, "");
    
    if (NOISE_TOKENS.has(lowerToken)) continue;
    if (/^\d{3,4}p$/i.test(token)) continue;
    if (/^[a-z]?[0-9]+\.[0-9]$/i.test(token)) continue;
    if (/^(x|h)\.?26[45]$/i.test(token)) continue;
    if (/^(dd[p+]?|dts|aac|ac3|eac3)/i.test(token)) continue;
    
    filteredTokens.push(token);
  }
  
  return filteredTokens.join(" ").replace(/\s+/g, " ").trim();
}

function toTitleCase(str: string): string {
  const minorWords = new Set(["a", "an", "the", "and", "but", "or", "for", "nor", "on", "at", "to", "by", "of", "in", "with"]);
  
  return str
    .toLowerCase()
    .split(" ")
    .map((word, index) => {
      if (index === 0 || !minorWords.has(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(" ");
}

export function parseMediaFilename(filePath: string, filename: string): ParsedMediaResult {
  const parentFolder = path.basename(filePath);
  const ext = path.extname(filename).slice(1).toLowerCase();
  
  let confidence = 0;
  let season: number | null = null;
  let episode: number | null = null;
  let episodeEnd: number | null = null;
  let isSeasonPack = false;
  let detectedType: "movie" | "tv_show" | "unknown" = "unknown";
  let detectedName: string | null = null;
  let year: number | null = null;
  
  const normalizedName = normalizeFilename(filename);
  const lowerName = normalizedName.toLowerCase();
  
  for (const pattern of SPECIAL_PATTERNS) {
    if (pattern.test(lowerName)) {
      season = 0;
      const match = normalizedName.match(/[eE][pP]?\s*(\d{1,3})/);
      if (match) {
        episode = parseInt(match[1]);
      }
      detectedType = "tv_show";
      confidence += 30;
      break;
    }
  }
  
  if (detectedType !== "tv_show") {
    for (const pattern of TV_PATTERNS) {
      const match = normalizedName.match(pattern);
      if (match) {
        season = parseInt(match[1]);
        episode = parseInt(match[2]);
        if (match[3]) {
          episodeEnd = parseInt(match[3]);
        }
        detectedType = "tv_show";
        confidence += 50;
        
        const patternIndex = normalizedName.search(pattern);
        if (patternIndex > 0) {
          let seriesName = normalizedName.slice(0, patternIndex).trim();
          seriesName = removeNoise(seriesName);
          if (seriesName) {
            detectedName = toTitleCase(seriesName);
          }
        }
        break;
      }
    }
  }
  
  if (detectedType !== "tv_show") {
    for (const pattern of SEASON_PACK_PATTERNS) {
      const match = normalizedName.match(pattern);
      if (match) {
        isSeasonPack = true;
        detectedType = "tv_show";
        confidence += 20;
        if (match[1]) {
          const seasonNum = match[1];
          if (/^\d+$/.test(seasonNum)) {
            season = parseInt(seasonNum);
          } else {
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
  
  if (detectedType !== "tv_show") {
    for (const pattern of YEAR_PATTERNS) {
      const match = normalizedName.match(pattern);
      if (match) {
        const potentialYear = parseInt(match[1]);
        if (potentialYear >= 1900 && potentialYear <= new Date().getFullYear() + 1) {
          year = potentialYear;
          detectedType = "movie";
          confidence += 40;
          
          const yearIndex = normalizedName.indexOf(match[0]);
          if (yearIndex > 0) {
            let movieName = normalizedName.slice(0, yearIndex).trim();
            movieName = removeNoise(movieName);
            if (movieName) {
              detectedName = toTitleCase(movieName);
            }
          }
          break;
        }
      }
    }
  }
  
  if (!detectedName) {
    let cleanedNormalized = removeNoise(normalizedName);
    
    for (const pattern of TV_PATTERNS) {
      const match = cleanedNormalized.match(pattern);
      if (match) {
        const idx = cleanedNormalized.search(pattern);
        if (idx > 0) {
          cleanedNormalized = cleanedNormalized.slice(0, idx).trim();
        }
        break;
      }
    }
    
    for (const pattern of YEAR_PATTERNS) {
      const match = cleanedNormalized.match(pattern);
      if (match) {
        const idx = cleanedNormalized.indexOf(match[0]);
        if (idx > 0) {
          cleanedNormalized = cleanedNormalized.slice(0, idx).trim();
        }
        break;
      }
    }
    
    if (cleanedNormalized && cleanedNormalized.length > 1) {
      detectedName = toTitleCase(cleanedNormalized);
    }
  }
  
  if (!detectedName && parentFolder) {
    const folderLower = parentFolder.toLowerCase();
    if (!GENERIC_FOLDER_NAMES.has(folderLower)) {
      const cleanedFolder = removeNoise(normalizeFilename(parentFolder + ".tmp"));
      if (cleanedFolder && cleanedFolder.length > 1) {
        detectedName = toTitleCase(cleanedFolder);
        confidence += 10;
      }
    }
  }
  
  const cleanedName = detectedName || "";
  
  let seasonFolder: string | null = null;
  let destinationFilename: string | null = null;
  
  if (detectedType === "tv_show" && season !== null && episode !== null) {
    const paddedSeason = String(season).padStart(2, "0");
    const paddedEpisode = String(episode).padStart(2, "0");
    const episodeEndPart = episodeEnd ? `-E${String(episodeEnd).padStart(2, "0")}` : "";
    
    seasonFolder = `Season ${paddedSeason}`;
    destinationFilename = `${cleanedName} - S${paddedSeason}E${paddedEpisode}${episodeEndPart}.${ext}`;
  } else if (detectedType === "movie") {
    const yearPart = year ? ` (${year})` : "";
    destinationFilename = `${cleanedName}${yearPart}.${ext}`;
  }
  
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
    seasonFolder,
    destinationFilename,
  };
}

export const testCases = [
  { 
    input: "Fallout.S02E01.1080p.WEB-DL.Hindi.5.1-English.5.1.ESub.x264-HDHub4u.Ms.mkv",
    expected: { type: "tv_show", season: 2, episode: 1, cleanedName: "Fallout" }
  },
  { 
    input: "Breaking.Bad.S01E01.720p.BluRay.x264-DEMAND.mkv",
    expected: { type: "tv_show", season: 1, episode: 1, cleanedName: "Breaking Bad" }
  },
  { 
    input: "The.Office.US.S04.EP.01.1080p.WEB-DL.mkv",
    expected: { type: "tv_show", season: 4, episode: 1, cleanedName: "The Office Us" }
  },
  { 
    input: "Game of Thrones - 1x01 - Winter Is Coming.mp4",
    expected: { type: "tv_show", season: 1, episode: 1 }
  },
  { 
    input: "Stranger.Things.S04E01.2160p.WEB-DL.DDP5.1.Atmos.DV.MKV.x265-FLUX.mkv",
    expected: { type: "tv_show", season: 4, episode: 1, cleanedName: "Stranger Things" }
  },
  { 
    input: "Friends.S01E01E02.720p.mkv",
    expected: { type: "tv_show", season: 1, episode: 1, episodeEnd: 2 }
  },
  { 
    input: "The.Matrix.(1999).1080p.BluRay.mkv",
    expected: { type: "movie", year: 1999, cleanedName: "The Matrix" }
  },
  { 
    input: "Inception.2010.2160p.UHD.BluRay.mkv",
    expected: { type: "movie", year: 2010, cleanedName: "Inception" }
  },
  { 
    input: "The.Mandalorian.S02E01.Chapter.9.The.Marshal.2160p.WEB-DL.DDP5.1.Atmos.DV.x265-MZABI.mkv",
    expected: { type: "tv_show", season: 2, episode: 1 }
  },
  { 
    input: "Naruto - Special - OVA.mkv",
    expected: { type: "tv_show", season: 0 }
  },
  {
    input: "House.of.the.Dragon.S01E05.We.Light.the.Way.1080p.HMAX.WEB-DL.DDP5.1.x264-NTb.mkv",
    expected: { type: "tv_show", season: 1, episode: 5 }
  },
  {
    input: "random_video_file.mkv",
    expected: { type: "unknown" }
  },
];

export function runTests(): { passed: number; failed: number; results: any[] } {
  let passed = 0;
  let failed = 0;
  const results: any[] = [];
  
  for (const test of testCases) {
    const result = parseMediaFilename("/test/path", test.input);
    let success = true;
    
    if (test.expected.type && result.detectedType !== test.expected.type) success = false;
    if (test.expected.season !== undefined && result.season !== test.expected.season) success = false;
    if (test.expected.episode !== undefined && result.episode !== test.expected.episode) success = false;
    if (test.expected.episodeEnd !== undefined && result.episodeEnd !== test.expected.episodeEnd) success = false;
    if (test.expected.year !== undefined && result.year !== test.expected.year) success = false;
    if (test.expected.cleanedName !== undefined && result.cleanedName !== test.expected.cleanedName) success = false;
    
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
        cleanedName: result.cleanedName,
        seasonFolder: result.seasonFolder,
        destinationFilename: result.destinationFilename,
        confidence: result.confidence,
      },
      success,
    });
  }
  
  return { passed, failed, results };
}
