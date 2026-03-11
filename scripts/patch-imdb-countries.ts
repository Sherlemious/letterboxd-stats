/**
 * IMDb Country Patcher
 *
 * Adds country data to existing DB records using title.akas.tsv.gz.
 * Run this after import-imdb.ts if countries were missing.
 *
 * Usage:  npm run db:patch:countries [min-votes]
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
  if (res.statusCode !== 200) throw new Error(`HTTP ${res.statusCode} fetching ${url}`);
  const gunzip = createGunzip();
  res.pipe(gunzip);
  const rl = createInterface({ input: gunzip, crlfDelay: Infinity });
  for await (const line of rl) yield line;
}

async function main() {
  console.log('\nReelmates IMDb Country Patcher');
  console.log(`Database: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] ?? 'unknown'}\n`);

  // Step 1: basics → tconst -> {title, year}
  console.log('Step 1/3: title.basics.tsv.gz — collecting movie tconsts (~60 MB) …');
  const basics = new Map<string, { title: string; year: number }>();
  let lineNum = 0;
  for await (const line of streamLines(`${IMDB_BASE}/title.basics.tsv.gz`)) {
    if (lineNum++ === 0) continue;
    const p = line.split('\t');
    if (p[1] !== 'movie' || p[4] === '1') continue;
    const year = parseInt(p[5], 10);
    if (!year || year < 1880 || year > 2030) continue;
    basics.set(p[0], { title: p[2], year });
    if (lineNum % 1_000_000 === 0)
      process.stdout.write(`\r  ${lineNum.toLocaleString()} rows · ${basics.size.toLocaleString()} movies`);
  }
  console.log(`\r  ${basics.size.toLocaleString()} movies collected`);

  // Step 2: ratings → filter by votes
  console.log(`\nStep 2/3: title.ratings.tsv.gz — filtering to ≥ ${MIN_VOTES} votes (~8 MB) …`);
  // filtered: tconst -> {title, year, country}
  const filtered = new Map<string, { title: string; year: number; country?: string }>();
  lineNum = 0;
  for await (const line of streamLines(`${IMDB_BASE}/title.ratings.tsv.gz`)) {
    if (lineNum++ === 0) continue;
    const [tconst, , numVotesStr] = line.split('\t');
    if (parseInt(numVotesStr, 10) < MIN_VOTES) continue;
    const movie = basics.get(tconst);
    if (movie) {
      filtered.set(tconst, movie);
      basics.delete(tconst);
    }
  }
  basics.clear();
  console.log(`  ${filtered.size.toLocaleString()} movies to enrich`);

  // Step 3: akas → grab first recognized region per movie
  console.log('\nStep 3/3: title.akas.tsv.gz — extracting countries (~481 MB) …');
  lineNum = 0;
  let found = 0;
  for await (const line of streamLines(`${IMDB_BASE}/title.akas.tsv.gz`)) {
    if (lineNum++ === 0) continue;
    const parts = line.split('\t');
    const tconst = parts[0];
    const movie = filtered.get(tconst);
    if (!movie || movie.country) continue; // unknown or already set
    const region = parts[3];
    if (!region || region === '\\N') continue;
    const countryName = ISO_TO_COUNTRY[region];
    if (countryName) { movie.country = countryName; found++; }
    if (lineNum % 2_000_000 === 0)
      process.stdout.write(`\r  ${lineNum.toLocaleString()} rows · ${found.toLocaleString()} countries`);
  }
  console.log(`\r  ${lineNum.toLocaleString()} rows · ${found.toLocaleString()} countries found`);

  // Upsert just the country field
  console.log(`\nUpdating ${found.toLocaleString()} DB records with country …\n`);

  const toUpdate = [...filtered.values()].filter(m => m.country);
  let updated = 0, skipped = 0;

  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batch = toUpdate.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(m =>
        prisma.movie.updateMany({
          where: { title: m.title, year: m.year },
          data: { country: m.country },
        })
      )
    );
    results.forEach(r => { r.status === 'fulfilled' ? updated++ : skipped++; });
    process.stdout.write(`\r  ${updated.toLocaleString()} updated, ${skipped} skipped`);
  }

  console.log(`\r  ${updated.toLocaleString()} records updated with country data\n`);
  console.log('Done!\n');
  await prisma.$disconnect();
}

main().catch(async e => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
