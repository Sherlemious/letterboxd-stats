import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { FilmMeta } from '@/lib/types';
import { filmKey } from '@/lib/utils';

type UpsertFilm = {
  name: string;
  year: number;
  meta: FilmMeta;
};

type DbMovie = {
  title: string;
  year: number;
  director: string | null;
  genres: string;
  country: string | null;
  letterboxdRating: number | null;
};

// Batch size for SQL IN clause — avoids massive queries for large collections
const CHUNK_SIZE = 500;

export async function POST(req: NextRequest) {
  try {
    const { films } = (await req.json()) as { films: { name: string; year: number }[] };

    if (!Array.isArray(films) || films.length === 0) {
      return NextResponse.json({});
    }

    const uniqueTitles = [...new Set(films.map(f => f.name.toLowerCase()))];
    const results: Record<string, FilmMeta> = {};

    // Process in chunks to keep SQL queries manageable
    for (let i = 0; i < uniqueTitles.length; i += CHUNK_SIZE) {
      const chunk = uniqueTitles.slice(i, i + CHUNK_SIZE);
      const placeholders = chunk.map((_, idx) => `$${idx + 1}`).join(', ');

      const movies = await prisma.$queryRawUnsafe<DbMovie[]>(
        `SELECT title, year, director, genres, country, "letterboxdRating"
         FROM "Movie"
         WHERE LOWER(title) IN (${placeholders})`,
        ...chunk,
      );

      for (const movie of movies) {
        // Match on title (case-insensitive) + year (±1 to account for release date differences)
        const match = films.find(
          f =>
            f.name.toLowerCase() === movie.title.toLowerCase() &&
            Math.abs(f.year - movie.year) <= 1,
        );
        if (match) {
          results[filmKey(match.name, match.year)] = {
            director: movie.director ?? 'Unknown',
            genres: JSON.parse(movie.genres ?? '[]'),
            country: movie.country ?? 'Unknown',
            lbAvg: movie.letterboxdRating ?? 0,
          };
        }
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    // Don't let DB errors break the upload flow — return empty so client falls back gracefully
    console.error('[/api/movies] lookup failed:', error);
    return NextResponse.json({});
  }
}

// PUT — batch upsert film metadata (called after TMDB enrichment on user upload)
export async function PUT(req: NextRequest) {
  try {
    const { films } = (await req.json()) as { films: UpsertFilm[] };

    if (!Array.isArray(films) || films.length === 0) {
      return NextResponse.json({ upserted: 0 });
    }

    let upserted = 0;
    // Process sequentially in small batches — this is fire-and-forget so throughput isn't critical
    for (const film of films) {
      try {
        await prisma.movie.upsert({
          where: { title_year: { title: film.name, year: film.year } },
          update: {
            director: film.meta.director,
            genres: JSON.stringify(film.meta.genres),
            country: film.meta.country,
            letterboxdRating: film.meta.lbAvg,
          },
          create: {
            title: film.name,
            year: film.year,
            director: film.meta.director,
            genres: JSON.stringify(film.meta.genres),
            country: film.meta.country,
            letterboxdRating: film.meta.lbAvg,
          },
        });
        upserted++;
      } catch {
        // Skip individual failures (e.g. duplicate tmdbId from a concurrent TMDB ingest)
      }
    }

    return NextResponse.json({ upserted });
  } catch (error) {
    console.error('[/api/movies] upsert failed:', error);
    return NextResponse.json({ upserted: 0 });
  }
}
