/**
 * Kaggle 950K Letterboxd Dataset Importer
 *
 * Dataset: https://www.kaggle.com/datasets/gsimonx37/letterboxd
 * Reads only movies.csv — flat records, no joins.
 *
 * Usage:
 *   npm run db:import:950k -- <path-to-movies.csv> [max-rows]
 *
 * Examples:
 *   npm run db:import:950k -- ~/Downloads/letterboxd/movies.csv
 *   npm run db:import:950k -- ~/Downloads/letterboxd/movies.csv 100000
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
const MAX_ROWS = parseInt(process.argv[3] ?? '0', 10) || Infinity;

if (!CSV_PATH) {
  console.error('Usage: npm run db:import:950k -- <path-to-movies.csv> [max-rows]');
  process.exit(1);
}

const prisma = new PrismaClient();
const BATCH_SIZE = 200;

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
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

async function main() {
  console.log(`\nLetterboxd 950K Importer (flat movies.csv)`);
  console.log(`File     : ${CSV_PATH}`);
  console.log(`Max rows : ${MAX_ROWS === Infinity ? 'all' : MAX_ROWS.toLocaleString()}`);
  console.log(`Database : ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] ?? 'unknown'}\n`);

  const rl = createInterface({ input: createReadStream(CSV_PATH), crlfDelay: Infinity });
  const lines = rl[Symbol.asyncIterator]();

  // Detect columns from header
  const headerLine = (await lines.next()).value as string;
  const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim());

  const find = (...candidates: string[]) =>
    candidates.reduce((found, c) =>
      found !== -1 ? found : headers.findIndex(h => h === c || h.includes(c)), -1);

  const titleCol  = find('name', 'title', 'film');
  const dateCol   = find('date', 'year', 'release_date', 'release_year');
  const ratingCol = find('average_rating', 'avg_rating', 'rating', 'letterboxd_rating');

  console.log(`Columns detected:`);
  console.log(`  title  → ${titleCol  === -1 ? 'NOT FOUND' : `"${headers[titleCol]}"`}`);
  console.log(`  date   → ${dateCol   === -1 ? 'NOT FOUND' : `"${headers[dateCol]}"`}`);
  console.log(`  rating → ${ratingCol === -1 ? 'not found (will be null)' : `"${headers[ratingCol]}"`}\n`);

  if (titleCol === -1 || dateCol === -1) {
    console.error('Cannot find required title/date columns. Available:', headers.join(', '));
    process.exit(1);
  }

  type UpsertArgs = Parameters<typeof prisma.movie.upsert>[0];
  let batch: UpsertArgs[] = [];
  let totalUpserted = 0;
  let totalSkipped = 0;
  let rowNum = 0;

  const flush = async () => {
    const results = await Promise.allSettled(batch.map(args => prisma.movie.upsert(args)));
    results.forEach(r => { if (r.status === 'rejected') totalSkipped++; });
    totalUpserted += results.filter(r => r.status === 'fulfilled').length;
    batch = [];
  };

  for await (const line of lines) {
    if (rowNum >= MAX_ROWS) break;
    rowNum++;

    const cols  = parseCSVLine(line);
    const title = cols[titleCol]?.trim() ?? '';
    const dateRaw = cols[dateCol]?.trim() ?? '';
    const year  = parseInt(dateRaw.length > 4 ? dateRaw.split(/[-/]/)[0] : dateRaw, 10);

    if (!title || !year || isNaN(year) || year < 1880 || year > 2030) continue;

    const ratingRaw = ratingCol === -1 ? NaN : parseFloat(cols[ratingCol] ?? '');
    const letterboxdRating = isNaN(ratingRaw) ? null : Math.round(ratingRaw * 10) / 10;

    batch.push({
      where: { title_year: { title, year } },
      update: { letterboxdRating },
      create: { title, year, genres: '[]', letterboxdRating },
    });

    if (batch.length >= BATCH_SIZE) {
      await flush();
      process.stdout.write(
        `\r  Row ${rowNum.toLocaleString()} | ${totalUpserted.toLocaleString()} upserted, ${totalSkipped} skipped`
      );
    }
  }

  if (batch.length > 0) await flush();
  console.log(`\n\nDone! ${totalUpserted.toLocaleString()} upserted, ${totalSkipped} skipped.\n`);
  await prisma.$disconnect();
}

main().catch(async e => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
