/**
 * Kaggle 16K Letterboxd Dataset Importer
 *
 * Dataset: https://www.kaggle.com/datasets/kutayahin/letterboxd-movies-dataset
 * ~16,246 films with actual Letterboxd average ratings (updated Oct 2025)
 *
 * Usage:
 *   npm run db:import:16k -- <path-to-csv>
 *
 * Example:
 *   npm run db:import:16k -- ~/Downloads/letterboxd-movies.csv
 */

import { PrismaClient } from '@prisma/client';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const CSV_PATH = process.argv[2];

if (!CSV_PATH) {
  console.error('Usage: npm run db:import:16k -- <path-to-csv>');
  process.exit(1);
}

const prisma = new PrismaClient();
const BATCH_SIZE = 100;

// ── CSV parser ────────────────────────────────────────────────────────────────
// Handles quoted fields and escaped quotes ("") — covers everything in this dataset

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ── Column resolver ───────────────────────────────────────────────────────────
// Maps common variations of column names to our canonical field names

function resolveColumns(headers: string[]): Record<string, number> {
  const lower = headers.map(h => h.toLowerCase().trim());
  const find = (...candidates: string[]) => {
    for (const c of candidates) {
      const idx = lower.findIndex(h => h === c || h.includes(c));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const map: Record<string, number> = {
    title:  find('film', 'title', 'name', 'movie'),
    year:   find('year', 'release_year', 'release year', 'date'),
    director: find('director'),
    genres: find('genres', 'genre'),
    country: find('country', 'country_of_origin', 'origin'),
    rating: find('average_rating', 'avg_rating', 'letterboxd_rating', 'rating', 'average rating'),
  };

  console.log('\nDetected column mapping:');
  for (const [field, idx] of Object.entries(map)) {
    console.log(`  ${field.padEnd(10)} → ${idx === -1 ? '(not found)' : `col ${idx} "${headers[idx]}"`}`);
  }

  if (map.title === -1 || map.year === -1) {
    console.error('\nError: Could not find required "title" and "year" columns.');
    console.error('Available columns:', headers.join(', '));
    process.exit(1);
  }

  return map;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nLetterboxd 16K Dataset Importer`);
  console.log(`File     : ${CSV_PATH}`);
  console.log(`Database : ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] ?? 'unknown'}\n`);

  const rl = createInterface({ input: createReadStream(CSV_PATH), crlfDelay: Infinity });
  const lines = rl[Symbol.asyncIterator]();

  // Read header row
  const headerLine = (await lines.next()).value as string;
  const headers = parseCSVLine(headerLine);
  const cols = resolveColumns(headers);

  console.log('');

  let batch: Parameters<typeof prisma.movie.upsert>[0][] = [];
  let totalUpserted = 0;
  let totalSkipped = 0;
  let lineNum = 1;

  const flush = async () => {
    await Promise.all(
      batch.map(args =>
        prisma.movie.upsert(args).catch(() => { totalSkipped++; })
      )
    );
    totalUpserted += batch.length;
    batch = [];
  };

  for await (const line of lines) {
    lineNum++;
    if (!line.trim()) continue;

    const cols_ = parseCSVLine(line);
    const get = (idx: number) => (idx === -1 ? '' : (cols_[idx] ?? '').trim());

    const title = get(cols.title);
    const yearRaw = get(cols.year);
    // Some datasets encode year as full date "2001-01-01" — extract the year part
    const year = parseInt(yearRaw.length > 4 ? yearRaw.split(/[-/]/)[0] : yearRaw, 10);

    if (!title || !year || isNaN(year)) continue;

    const director = get(cols.director) || null;
    // Genres may be pipe-separated, semicolon-separated, or JSON-ish
    const genreRaw = get(cols.genres);
    const genres = genreRaw
      ? genreRaw.replace(/[\[\]'"]/g, '').split(/[|;,]/).map(g => g.trim()).filter(Boolean)
      : [];
    const country = get(cols.country) || null;
    const ratingRaw = parseFloat(get(cols.rating));
    const letterboxdRating = isNaN(ratingRaw) ? null : Math.round(ratingRaw * 10) / 10;

    batch.push({
      where: { title_year: { title, year } },
      update: { director, genres: JSON.stringify(genres), country, letterboxdRating },
      create: { title, year, director, genres: JSON.stringify(genres), country, letterboxdRating },
    } as Parameters<typeof prisma.movie.upsert>[0]);

    if (batch.length >= BATCH_SIZE) {
      await flush();
      process.stdout.write(`\r  Processed ${lineNum} rows | ${totalUpserted} upserted, ${totalSkipped} skipped`);
    }
  }

  if (batch.length > 0) await flush();

  console.log(`\n\nDone! ${totalUpserted} movies upserted, ${totalSkipped} skipped.\n`);
  await prisma.$disconnect();
}

main().catch(async e => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
