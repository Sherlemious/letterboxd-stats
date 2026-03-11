/**
 * IMDb Public Dataset Importer
 *
 * Downloads 5 IMDb TSV files and upserts movies with genres, ratings,
 * directors, and countries into the Neon database.
 *
 * No API key required. Data is free for personal/non-commercial use.
 * Courtesy of IMDb (https://www.imdb.com).
 *
 * Usage:
 *   npm run db:import:imdb [min-votes]
 *
 * Examples:
 *   npm run db:import:imdb          # 500 min votes  (~70K movies)
 *   npm run db:import:imdb 100      # 100 min votes  (~200K movies)
 *   npm run db:import:imdb 5000     # 5 000 min votes (~30K movies)
 *
 * Downloads ~930 MB total (basics 60 + ratings 8 + crew 80 + names 300 + akas 481).
 */

import { PrismaClient } from '@prisma/client';
import { createGunzip } from 'zlib';
import { createInterface } from 'readline';
import { request } from 'https';
import type { IncomingMessage } from 'http';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const IMDB_BASE = 'https://datasets.imdbws.com';
const MIN_VOTES = parseInt(process.argv[2] ?? '500', 10);
const BATCH_SIZE = 200;
const prisma = new PrismaClient();

// ISO 3166-1 alpha-2 → country name used in the app's COUNTRY_FLAGS
const ISO_TO_COUNTRY: Record<string, string> = {
  US: 'USA', GB: 'UK', FR: 'France', IT: 'Italy', JP: 'Japan',
  KR: 'South Korea', DE: 'Germany', RU: 'Russia', SE: 'Sweden',
  ES: 'Spain', MX: 'Mexico', IR: 'Iran', PL: 'Poland', IN: 'India',
  TW: 'Taiwan', HK: 'Hong Kong', CN: 'China', AU: 'Australia',
  DK: 'Denmark', AT: 'Austria', IE: 'Ireland', BE: 'Belgium',
  NZ: 'New Zealand', NO: 'Norway', GR: 'Greece', BR: 'Brazil',
  AR: 'Argentina', CA: 'Canada', CZ: 'Czech Republic', FI: 'Finland',
  HU: 'Hungary', NL: 'Netherlands', PT: 'Portugal', RO: 'Romania',
  TR: 'Turkey', UA: 'Ukraine', ZA: 'South Africa', TH: 'Thailand',
  PH: 'Philippines', NG: 'Nigeria', EG: 'Egypt', IL: 'Israel',
};

// ── Streaming helper ──────────────────────────────────────────────────────────

async function* streamLines(url: string, depth = 0): AsyncGenerator<string> {
  if (depth > 5) throw new Error('Too many redirects');

  const res = await new Promise<IncomingMessage>((resolve, reject) => {
    const req = request(url, (r) => resolve(r));
    req.on('error', reject);
    req.end();
  });

  if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
    res.resume();
    yield* streamLines(res.headers.location, depth + 1);
    return;
  }

  if (res.statusCode !== 200) {
    throw new Error(`HTTP ${res.statusCode} fetching ${url}`);
  }

  const gunzip = createGunzip();
  res.pipe(gunzip);
  const rl = createInterface({ input: gunzip, crlfDelay: Infinity });
  for await (const line of rl) yield line;
}

function log(step: number, total: number, msg: string) {
  console.log(`\nStep ${step}/${total}: ${msg}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nReelmates IMDb Full Importer (genres + ratings + directors + countries)');
  console.log(`Min votes : ${MIN_VOTES.toLocaleString()}`);
  console.log(`Database  : ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] ?? 'unknown'}\n`);

  // ── Step 1: title.basics.tsv.gz ──────────────────────────────────────────
  log(1, 5, 'title.basics.tsv.gz — collecting movies (~60 MB) …');

  interface MovieData {
    title: string;
    year: number;
    genres: string[];
    rating?: number;
    directorNconst?: string;
    director?: string;
    country?: string;
  }

  const basics = new Map<string, MovieData>();
  let lineNum = 0;

  for await (const line of streamLines(`${IMDB_BASE}/title.basics.tsv.gz`)) {
    if (lineNum++ === 0) continue;
    const p = line.split('\t');
    if (p[1] !== 'movie') continue;
    if (p[4] === '1') continue; // isAdult

    const year = parseInt(p[5], 10);
    if (!year || year < 1880 || year > 2030) continue;

    const genres = !p[8] || p[8] === '\\N' ? [] : p[8].split(',');
    basics.set(p[0], { title: p[2], year, genres });

    if (lineNum % 1_000_000 === 0) {
      process.stdout.write(`\r  ${lineNum.toLocaleString()} rows · ${basics.size.toLocaleString()} movies`);
    }
  }
  console.log(`\r  ${lineNum.toLocaleString()} rows · ${basics.size.toLocaleString()} movies collected`);

  // ── Step 2: title.ratings.tsv.gz ─────────────────────────────────────────
  log(2, 5, `title.ratings.tsv.gz — filtering to ≥ ${MIN_VOTES} votes (~8 MB) …`);

  const filtered = new Map<string, MovieData>();
  lineNum = 0;

  for await (const line of streamLines(`${IMDB_BASE}/title.ratings.tsv.gz`)) {
    if (lineNum++ === 0) continue;
    const [tconst, avgRatingStr, numVotesStr] = line.split('\t');
    if (parseInt(numVotesStr, 10) < MIN_VOTES) continue;
    const movie = basics.get(tconst);
    if (!movie) continue;
    movie.rating = Math.round(parseFloat(avgRatingStr) * 10) / 10;
    filtered.set(tconst, movie);
    basics.delete(tconst); // free memory progressively
  }

  basics.clear(); // drop the rest
  console.log(`  ${filtered.size.toLocaleString()} movies kept after vote filter`);

  // ── Step 3: title.crew.tsv.gz ─────────────────────────────────────────────
  log(3, 5, 'title.crew.tsv.gz — extracting directors (~80 MB) …');
  lineNum = 0;

  for await (const line of streamLines(`${IMDB_BASE}/title.crew.tsv.gz`)) {
    if (lineNum++ === 0) continue;
    const [tconst, directorsRaw] = line.split('\t');
    const movie = filtered.get(tconst);
    if (!movie || !directorsRaw || directorsRaw === '\\N') continue;
    movie.directorNconst = directorsRaw.split(',')[0]; // first director
    if (lineNum % 500_000 === 0) {
      process.stdout.write(`\r  ${lineNum.toLocaleString()} rows processed`);
    }
  }

  const neededNconsts = new Set(
    [...filtered.values()].map(m => m.directorNconst).filter(Boolean) as string[]
  );
  console.log(`\r  ${lineNum.toLocaleString()} rows · ${neededNconsts.size.toLocaleString()} unique directors to resolve`);

  // ── Step 4: name.basics.tsv.gz ────────────────────────────────────────────
  log(4, 5, `name.basics.tsv.gz — resolving ${neededNconsts.size.toLocaleString()} director names (~300 MB) …`);

  const nconst2name = new Map<string, string>();
  lineNum = 0;

  for await (const line of streamLines(`${IMDB_BASE}/name.basics.tsv.gz`)) {
    if (lineNum++ === 0) continue;
    const tab = line.indexOf('\t');
    const nconst = line.slice(0, tab);
    if (!neededNconsts.has(nconst)) continue;
    const rest = line.slice(tab + 1);
    const name = rest.split('\t')[0];
    nconst2name.set(nconst, name);
    if (lineNum % 1_000_000 === 0) {
      process.stdout.write(`\r  ${lineNum.toLocaleString()} rows · ${nconst2name.size.toLocaleString()} names resolved`);
    }
  }

  // Assign director names
  for (const movie of filtered.values()) {
    if (movie.directorNconst) {
      movie.director = nconst2name.get(movie.directorNconst);
    }
  }
  console.log(`\r  ${lineNum.toLocaleString()} rows · ${nconst2name.size.toLocaleString()} names resolved`);

  // ── Step 5: title.akas.tsv.gz ─────────────────────────────────────────────
  log(5, 5, 'title.akas.tsv.gz — extracting original countries (~481 MB) …');
  lineNum = 0;
  let countriesFound = 0;

  // akas is sorted by (titleId, ordering) — just grab the first recognized region per movie
  for await (const line of streamLines(`${IMDB_BASE}/title.akas.tsv.gz`)) {
    if (lineNum++ === 0) continue;
    // columns: titleId, ordering, title, region, language, types, attributes, isOriginalTitle
    const parts = line.split('\t');
    const tconst = parts[0];
    const movie = filtered.get(tconst);
    if (!movie || movie.country) continue; // skip unknown or already-set

    const region = parts[3];
    if (!region || region === '\\N') continue;
    const countryName = ISO_TO_COUNTRY[region];
    if (countryName) {
      movie.country = countryName;
      countriesFound++;
    }
    if (lineNum % 2_000_000 === 0) {
      process.stdout.write(`\r  ${lineNum.toLocaleString()} rows · ${countriesFound.toLocaleString()} countries found`);
    }
  }
  console.log(`\r  ${lineNum.toLocaleString()} rows · ${countriesFound.toLocaleString()} countries found`);

  // ── Upsert ────────────────────────────────────────────────────────────────
  console.log(`\nUpserting ${filtered.size.toLocaleString()} movies to DB …\n`);

  type UpsertArgs = Parameters<typeof prisma.movie.upsert>[0];
  let batch: UpsertArgs[] = [];
  let totalUpserted = 0;
  let totalSkipped = 0;

  const flush = async () => {
    const results = await Promise.allSettled(batch.map(args => prisma.movie.upsert(args)));
    results.forEach(r => { if (r.status === 'rejected') totalSkipped++; });
    totalUpserted += results.filter(r => r.status === 'fulfilled').length;
    batch = [];
  };

  for (const movie of filtered.values()) {
    batch.push({
      where: { title_year: { title: movie.title, year: movie.year } },
      update: {
        genres: JSON.stringify(movie.genres),
        imdbRating: movie.rating ?? null,
        director: movie.director ?? null,
        country: movie.country ?? null,
      },
      create: {
        title: movie.title,
        year: movie.year,
        genres: JSON.stringify(movie.genres),
        imdbRating: movie.rating ?? null,
        director: movie.director ?? null,
        country: movie.country ?? null,
      },
    });

    if (batch.length >= BATCH_SIZE) {
      await flush();
      process.stdout.write(
        `\r  ${totalUpserted.toLocaleString()} upserted, ${totalSkipped} skipped`
      );
    }
  }

  if (batch.length > 0) await flush();

  console.log(`\r  ${totalUpserted.toLocaleString()} upserted, ${totalSkipped} skipped`);
  console.log(`\nDone! ${totalUpserted.toLocaleString()} movies with genres, ratings, directors, and countries.\n`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
