import { FilmMeta } from './types';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const CACHE_KEY = 'reelmates_tmdb_cache';
const API_KEY_STORAGE = 'reelmates_tmdb_key';

interface TMDBSearchResult {
  id: number;
  title: string;
  release_date: string;
}

interface TMDBMovieDetail {
  id: number;
  title: string;
  release_date: string;
  genres: { id: number; name: string }[];
  production_countries: { iso_3166_1: string; name: string }[];
  vote_average: number;
  credits?: {
    crew: { job: string; name: string }[];
  };
}

// --- API Key Management ---
export function getTmdbApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE);
}

export function setTmdbApiKey(key: string) {
  localStorage.setItem(API_KEY_STORAGE, key);
}

export function clearTmdbApiKey() {
  localStorage.removeItem(API_KEY_STORAGE);
}

// --- Cache ---
function getCache(): Record<string, FilmMeta> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setCache(cache: Record<string, FilmMeta>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full, clear old entries
    localStorage.removeItem(CACHE_KEY);
  }
}

function cacheKey(name: string, year: number): string {
  return `${name.toLowerCase()}-${year}`;
}

// --- API Calls ---
async function searchMovie(apiKey: string, name: string, year: number): Promise<number | null> {
  const params = new URLSearchParams({
    api_key: apiKey,
    query: name,
    year: year.toString(),
    language: 'en-US',
  });

  try {
    const res = await fetch(`${TMDB_BASE}/search/movie?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    const results: TMDBSearchResult[] = data.results || [];

    // Best match: exact title + year
    const exactMatch = results.find(r => {
      const releaseYear = r.release_date ? parseInt(r.release_date.split('-')[0]) : 0;
      return releaseYear === year && r.title.toLowerCase() === name.toLowerCase();
    });

    if (exactMatch) return exactMatch.id;

    // Close match: same year, any title
    const yearMatch = results.find(r => {
      const releaseYear = r.release_date ? parseInt(r.release_date.split('-')[0]) : 0;
      return Math.abs(releaseYear - year) <= 1;
    });

    return yearMatch?.id || results[0]?.id || null;
  } catch {
    return null;
  }
}

async function getMovieDetails(apiKey: string, movieId: number): Promise<TMDBMovieDetail | null> {
  try {
    const res = await fetch(
      `${TMDB_BASE}/movie/${movieId}?api_key=${apiKey}&language=en-US&append_to_response=credits`
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function detailToFilmMeta(detail: TMDBMovieDetail): FilmMeta {
  const director = detail.credits?.crew?.find(c => c.job === 'Director')?.name || 'Unknown';
  const genres = detail.genres.map(g => g.name);
  const country = detail.production_countries[0]?.name || 'Unknown';
  const lbAvg = Math.round((detail.vote_average / 2) * 10) / 10; // TMDB is /10, convert to /5

  return { director, genres, country, lbAvg };
}

// --- Batch Enrichment ---
export interface EnrichmentProgress {
  current: number;
  total: number;
  status: string;
}

export async function enrichFilmsWithTMDB(
  films: { name: string; year: number }[],
  onProgress?: (progress: EnrichmentProgress) => void,
): Promise<Map<string, FilmMeta>> {
  const apiKey = getTmdbApiKey();
  if (!apiKey) return new Map();

  const cache = getCache();
  const result = new Map<string, FilmMeta>();
  const toFetch: { name: string; year: number; key: string }[] = [];

  // Check cache first
  for (const film of films) {
    const key = cacheKey(film.name, film.year);
    if (cache[key]) {
      result.set(key, cache[key]);
    } else {
      toFetch.push({ ...film, key });
    }
  }

  onProgress?.({ current: 0, total: toFetch.length, status: `${result.size} cached, ${toFetch.length} to fetch` });

  // Fetch in batches of 5 (rate limit friendly)
  const BATCH_SIZE = 5;
  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE);

    const promises = batch.map(async (film) => {
      const movieId = await searchMovie(apiKey, film.name, film.year);
      if (!movieId) return;

      const detail = await getMovieDetails(apiKey, movieId);
      if (!detail) return;

      const meta = detailToFilmMeta(detail);
      cache[film.key] = meta;
      result.set(film.key, meta);
    });

    await Promise.all(promises);

    onProgress?.({
      current: Math.min(i + BATCH_SIZE, toFetch.length),
      total: toFetch.length,
      status: `Fetching metadata...`,
    });

    // Small delay between batches to be rate-limit friendly
    if (i + BATCH_SIZE < toFetch.length) {
      await new Promise(r => setTimeout(r, 250));
    }
  }

  // Save updated cache
  setCache(cache);

  return result;
}

// --- Validate API Key ---
export async function validateTmdbApiKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${TMDB_BASE}/configuration?api_key=${apiKey}`);
    return res.ok;
  } catch {
    return false;
  }
}
