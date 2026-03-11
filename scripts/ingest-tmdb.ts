/**
 * TMDB Bulk Ingestion Script
 *
 * Fetches top-rated movies from TMDB and upserts them into the Neon database.
 *
 * Usage:
 *   TMDB_API_KEY=<your_key> npm run db:ingest [pages] [endpoint]
 *
 * Arguments:
 *   pages     Number of pages to fetch (default: 200, max: 500). Each page = 20 movies.
 *   endpoint  TMDB list to pull from: top_rated | popular | now_playing (default: top_rated)
 *
 * Examples:
 *   TMDB_API_KEY=abc123 npm run db:ingest              # 200 pages of top_rated (4000 movies)
 *   TMDB_API_KEY=abc123 npm run db:ingest 500          # 500 pages (10,000 movies)
 *   TMDB_API_KEY=abc123 npm run db:ingest 100 popular  # 100 pages of popular
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const TMDB_BASE = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY;

if (!API_KEY) {
  console.error('Error: TMDB_API_KEY environment variable is required.');
  console.error('Usage: TMDB_API_KEY=<your_key> npm run db:ingest [pages] [endpoint]');
  process.exit(1);
}

const MAX_PAGES = Math.min(parseInt(process.argv[2] ?? '200', 10), 500);
const ENDPOINT = (process.argv[3] ?? 'top_rated') as 'top_rated' | 'popular' | 'now_playing';
const BATCH_SIZE = 10; // concurrent detail fetches per page
const DELAY_MS = 100; // ms between page batches

const prisma = new PrismaClient();

// ── Types ────────────────────────────────────────────────────────────────────

interface TMDBGenre {
  id: number;
  name: string;
}

interface TMDBListItem {
  id: number;
  title: string;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
}

interface TMDBListResponse {
  page: number;
  total_pages: number;
  results: TMDBListItem[];
}

interface TMDBDetail {
  id: number;
  title: string;
  release_date: string;
  vote_average: number;
  genres: TMDBGenre[];
  production_countries: { iso_3166_1: string; name: string }[];
  credits?: {
    crew: { job: string; name: string }[];
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function tmdbFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${TMDB_BASE}${path}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    if (!res.ok) {
      if (res.status === 429) {
        // Rate limited — wait and retry once
        await sleep(2000);
        const retry = await fetch(`${TMDB_BASE}${path}`, {
          headers: { Authorization: `Bearer ${API_KEY}` },
        });
        if (!retry.ok) return null;
        return retry.json() as Promise<T>;
      }
      return null;
    }
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function extractYear(releaseDate: string): number {
  return releaseDate ? parseInt(releaseDate.split('-')[0], 10) : 0;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nReelmates TMDB Ingestion`);
  console.log(`Endpoint : /movie/${ENDPOINT}`);
  console.log(`Pages    : up to ${MAX_PAGES} (${MAX_PAGES * 20} movies)`);
  console.log(`Database : ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] ?? 'unknown'}\n`);

  // Fetch genre map first
  const genreData = await tmdbFetch<{ genres: TMDBGenre[] }>('/genre/movie/list?language=en-US');
  const genreMap = new Map<number, string>(genreData?.genres.map(g => [g.id, g.name]) ?? []);
  console.log(`Loaded ${genreMap.size} genres from TMDB.\n`);

  let totalUpserted = 0;
  let totalFailed = 0;
  let page = 1;
  let totalPages = MAX_PAGES;

  while (page <= Math.min(totalPages, MAX_PAGES)) {
    const list = await tmdbFetch<TMDBListResponse>(
      `/movie/${ENDPOINT}?language=en-US&page=${page}`
    );

    if (!list) {
      console.warn(`  Page ${page}: failed to fetch — skipping`);
      page++;
      continue;
    }

    // Update ceiling from TMDB's total_pages (capped at MAX_PAGES)
    totalPages = Math.min(list.total_pages, MAX_PAGES);

    const movies = list.results.filter(m => extractYear(m.release_date) > 0);
    const pageLabel = `[${page}/${Math.min(list.total_pages, MAX_PAGES)}]`;

    // Fetch details for all movies on this page in parallel (BATCH_SIZE at a time)
    let upserted = 0;
    for (let i = 0; i < movies.length; i += BATCH_SIZE) {
      const batch = movies.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (movie) => {
          const detail = await tmdbFetch<TMDBDetail>(
            `/movie/${movie.id}?language=en-US&append_to_response=credits`
          );

          if (!detail) {
            totalFailed++;
            return;
          }

          const director = detail.credits?.crew.find(c => c.job === 'Director')?.name ?? null;
          const genres = detail.genres.map(g => g.name);
          const country = detail.production_countries[0]?.name ?? null;
          const year = extractYear(detail.release_date);
          // TMDB vote_average is /10; Letterboxd is /5
          const letterboxdRating = Math.round((detail.vote_average / 2) * 10) / 10;

          try {
            await prisma.movie.upsert({
              where: { title_year: { title: detail.title, year } },
              update: {
                tmdbId: detail.id,
                director,
                genres: JSON.stringify(genres),
                country,
                letterboxdRating,
              },
              create: {
                tmdbId: detail.id,
                title: detail.title,
                year,
                director,
                genres: JSON.stringify(genres),
                country,
                letterboxdRating,
              },
            });
            upserted++;
            totalUpserted++;
          } catch {
            totalFailed++;
          }
        })
      );
    }

    process.stdout.write(
      `\r${pageLabel} Page ${page}: ${upserted}/${movies.length} movies saved | Total: ${totalUpserted} upserted, ${totalFailed} failed`
    );

    page++;
    if (page <= Math.min(totalPages, MAX_PAGES)) await sleep(DELAY_MS);
  }

  console.log(`\n\nDone! ${totalUpserted} movies upserted, ${totalFailed} failed.\n`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
