import { LetterboxdEntry, DiaryEntry, DirectorStat, GenreStat, AdvancedSoloStats, AdvancedCompareStats, FilmRecommendation, FilmMeta } from './types';
import { COUNTRY_FLAGS, NON_ENGLISH_COUNTRIES } from './film-metadata';
import { CURATED_FILMS } from './film-data';
import { getAvgRating } from './stats';

interface EnrichedEntry extends LetterboxdEntry {
  director?: string;
  genres?: string[];
  country?: string;
  lbAvg?: number;
}

function enrichEntries(entries: LetterboxdEntry[], metadata: Map<string, FilmMeta>): { enriched: EnrichedEntry[]; enrichedCount: number } {
  let enrichedCount = 0;
  const enriched = entries.map(e => {
    const key = `${e.name.toLowerCase()}-${e.year}`;
    const meta = metadata.get(key);
    if (meta) {
      enrichedCount++;
      return { ...e, director: meta.director, genres: meta.genres, country: meta.country, lbAvg: meta.lbAvg };
    }
    return { ...e };
  });
  return { enriched, enrichedCount };
}

export function computeAdvancedSoloStats(entries: LetterboxdEntry[], diary: DiaryEntry[], metadata: Map<string, FilmMeta>): AdvancedSoloStats {
  const { enriched, enrichedCount } = enrichEntries(entries, metadata);
  const avg = getAvgRating(entries);

  // === CONTRARIAN SCORE ===
  const withAvg = enriched.filter(e => e.lbAvg !== undefined);
  const contrarianDiffs = withAvg.map(e => ({
    name: e.name,
    year: e.year,
    userRating: e.rating,
    avgRating: e.lbAvg!,
    diff: e.rating - e.lbAvg!,
  }));
  const absDiffs = contrarianDiffs.map(d => Math.abs(d.diff));
  const contrarianScore = absDiffs.length > 0
    ? Math.round((absDiffs.reduce((a, b) => a + b, 0) / absDiffs.length) * 100) / 100
    : 0;
  const contrarianLabel = contrarianScore >= 1.5 ? "Certified Contrarian"
    : contrarianScore >= 1.0 ? "Independent Thinker"
    : contrarianScore >= 0.5 ? "Mildly Rebellious"
    : "Crowd Pleaser";
  const contrarianFilms = [...contrarianDiffs]
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 8);

  // === AUTEUR LOYALTY ===
  const directorMap = new Map<string, { sum: number; count: number; films: string[] }>();
  enriched.forEach(e => {
    if (!e.director) return;
    const d = directorMap.get(e.director) || { sum: 0, count: 0, films: [] };
    d.sum += e.rating;
    d.count++;
    d.films.push(e.name);
    directorMap.set(e.director, d);
  });
  const auteurLoyalty: DirectorStat[] = [...directorMap.entries()]
    .map(([director, data]) => ({
      director,
      count: data.count,
      avgRating: Math.round((data.sum / data.count) * 100) / 100,
      films: data.films,
    }))
    .sort((a, b) => b.count - a.count);

  // === GENRE MOOD MAP ===
  const genreMap = new Map<string, { sum: number; count: number }>();
  enriched.forEach(e => {
    if (!e.genres) return;
    e.genres.forEach(g => {
      const d = genreMap.get(g) || { sum: 0, count: 0 };
      d.sum += e.rating;
      d.count++;
      genreMap.set(g, d);
    });
  });
  const genreMoodMap: GenreStat[] = [...genreMap.entries()]
    .map(([genre, data]) => ({
      genre,
      count: data.count,
      avgRating: Math.round((data.sum / data.count) * 100) / 100,
    }))
    .sort((a, b) => b.avgRating - a.avgRating);

  // === RECENCY BIAS ===
  const withYear = entries.filter(e => e.year > 1900);
  const oldFilms = withYear.filter(e => e.year < 2000);
  const newFilms = withYear.filter(e => e.year >= 2000);
  const oldAvg = oldFilms.length > 0 ? getAvgRating(oldFilms) : 0;
  const newAvg = newFilms.length > 0 ? getAvgRating(newFilms) : 0;
  const biasScore = Math.round((newAvg - oldAvg) * 100) / 100;
  const recencyBias = {
    label: biasScore > 0.3 ? "Recency bias detected — you're kinder to modern films"
      : biasScore < -0.3 ? "Reverse recency bias — you prefer the classics"
      : "No significant recency bias",
    oldAvg: Math.round(oldAvg * 100) / 100,
    newAvg: Math.round(newAvg * 100) / 100,
    biasScore,
  };

  // === REWATCH RATE ===
  const rewatches = diary.filter(d => d.rewatch);
  const rewatchRate = diary.length > 0 ? Math.round((rewatches.length / diary.length) * 100) : 0;

  // === BINGE STREAKS ===
  const uniqueDates = [...new Set(
    diary
      .map(d => d.date)
      .filter(Boolean)
      .map(d => { const dt = new Date(d); return isNaN(dt.getTime()) ? '' : dt.toISOString().split('T')[0]; })
      .filter(Boolean)
  )].sort();

  let maxStreak = 0, currentStreak = 1, streakStart = 0, bestStart = 0, bestEnd = 0;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1]);
    const curr = new Date(uniqueDates[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      currentStreak++;
    } else {
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        bestStart = streakStart;
        bestEnd = i - 1;
      }
      currentStreak = 1;
      streakStart = i;
    }
  }
  if (currentStreak > maxStreak) {
    maxStreak = currentStreak;
    bestStart = streakStart;
    bestEnd = uniqueDates.length - 1;
  }

  const bingeStreak = {
    days: maxStreak,
    startDate: uniqueDates[bestStart] || '',
    endDate: uniqueDates[bestEnd] || '',
  };

  // === SEASONAL PATTERNS ===
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthCounts: Record<number, number> = {};
  const monthGenres: Record<number, Record<string, number>> = {};
  diary.forEach(d => {
    if (!d.date) return;
    const date = new Date(d.date);
    if (isNaN(date.getTime())) return;
    const month = date.getMonth();
    monthCounts[month] = (monthCounts[month] || 0) + 1;
    const key = `${d.name.toLowerCase()}-${d.year}`;
    const meta = metadata.get(key);
    if (meta) {
      if (!monthGenres[month]) monthGenres[month] = {};
      meta.genres.forEach(g => {
        monthGenres[month][g] = (monthGenres[month][g] || 0) + 1;
      });
    }
  });
  const seasonalPatterns = monthNames.map((name, i) => {
    const genresForMonth = monthGenres[i] || {};
    const topGenre = Object.entries(genresForMonth).sort((a, b) => b[1] - a[1])[0]?.[0];
    return { month: name, count: monthCounts[i] || 0, topGenre };
  });

  // === FILM SNOB INDEX ===
  const pre1980 = entries.filter(e => e.year > 0 && e.year < 1980);
  const pre1980Pct = entries.length > 0 ? Math.round((pre1980.length / entries.length) * 100) : 0;
  const nonEnglish = enriched.filter(e => e.country && NON_ENGLISH_COUNTRIES.has(e.country));
  const nonEnglishPct = enrichedCount > 0 ? Math.round((nonEnglish.length / enrichedCount) * 100) : 0;
  const snobScore = Math.round((pre1980Pct * 0.5 + nonEnglishPct * 0.5));
  const snobLabel = snobScore >= 60 ? "Certified Film Snob 🎩"
    : snobScore >= 40 ? "Cinephile with Range"
    : snobScore >= 20 ? "Casual Explorer"
    : "Mainstream Maven";
  const filmSnobIndex = { score: snobScore, label: snobLabel, pre1980Pct, nonEnglishPct };

  // === CINEMATIC BLIND SPOTS ===
  const seenNames = new Set(entries.map(e => e.name.toLowerCase()));
  const blindSpots: FilmRecommendation[] = CURATED_FILMS
    .filter(f => !seenNames.has(f.name.toLowerCase()))
    .slice(0, 6);

  // === DIRECTOR LOYALTY TIERS ===
  const tieredDirectors = auteurLoyalty.filter(d => d.count >= 2);
  const scored = tieredDirectors.map(d => ({
    ...d,
    score: d.avgRating * 20 + Math.min(d.count, 8) * 2,
  })).sort((a, b) => b.score - a.score);

  const tiers: { tier: string; directors: DirectorStat[] }[] = [
    { tier: 'S', directors: scored.filter(d => d.avgRating >= 4.0 && d.count >= 3) },
    { tier: 'A', directors: scored.filter(d => !(d.avgRating >= 4.0 && d.count >= 3) && d.avgRating >= 3.5) },
    { tier: 'B', directors: scored.filter(d => d.avgRating >= 3.0 && d.avgRating < 3.5) },
    { tier: 'C', directors: scored.filter(d => d.avgRating < 3.0) },
  ];

  // === FILM PASSPORT ===
  const countryMap = new Map<string, number>();
  enriched.forEach(e => {
    if (!e.country) return;
    countryMap.set(e.country, (countryMap.get(e.country) || 0) + 1);
  });
  const filmPassport = [...countryMap.entries()]
    .map(([country, count]) => ({
      country,
      count,
      flag: COUNTRY_FLAGS[country] || '🎬',
    }))
    .sort((a, b) => b.count - a.count);

  return {
    contrarianScore,
    contrarianLabel,
    contrarianFilms,
    auteurLoyalty,
    genreMoodMap,
    recencyBias,
    rewatchRate,
    rewatchCount: rewatches.length,
    bingeStreak,
    seasonalPatterns,
    filmSnobIndex,
    blindSpots,
    directorTiers: tiers.filter(t => t.directors.length > 0),
    filmPassport,
    enrichedCount,
    totalCount: entries.length,
  };
}

export function computeAdvancedCompareStats(
  profileA: { name: string; entries: LetterboxdEntry[] },
  profileB: { name: string; entries: LetterboxdEntry[] },
  metadata: Map<string, FilmMeta>,
): AdvancedCompareStats {
  const mapA = new Map<string, LetterboxdEntry>();
  const mapB = new Map<string, LetterboxdEntry>();
  profileA.entries.forEach(e => mapA.set(`${e.name.toLowerCase()}-${e.year}`, e));
  profileB.entries.forEach(e => mapB.set(`${e.name.toLowerCase()}-${e.year}`, e));

  const sharedKeys = [...mapA.keys()].filter(k => mapB.has(k));

  // === DIVISIVE FILM AGREEMENTS (Taste Twin) ===
  const divisiveAgreements = sharedKeys
    .map(key => {
      const a = mapA.get(key)!;
      const b = mapB.get(key)!;
      const meta = metadata.get(key);
      if (!meta) return null;
      const diff = Math.abs(a.rating - b.rating);
      if (diff > 0.5) return null;
      const avgDeviation = Math.abs(((a.rating + b.rating) / 2) - meta.lbAvg);
      if (avgDeviation < 0.8) return null;
      return {
        name: a.name,
        year: a.year,
        ratingA: a.rating,
        ratingB: b.rating,
        avgRating: meta.lbAvg,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(((b!.ratingA + b!.ratingB) / 2) - b!.avgRating) - Math.abs(((a!.ratingA + a!.ratingB) / 2) - a!.avgRating))
    .slice(0, 10) as AdvancedCompareStats['divisiveAgreements'];

  // === DEALBREAKER FILMS ===
  const dealbreakers = sharedKeys
    .map(key => {
      const a = mapA.get(key)!;
      const b = mapB.get(key)!;
      const diff = Math.abs(a.rating - b.rating);
      return { name: a.name, year: a.year, ratingA: a.rating, ratingB: b.rating, diff };
    })
    .filter(d => d.diff >= 2.5)
    .sort((a, b) => b.diff - a.diff)
    .slice(0, 10);

  // === INFLUENCE MAP ===
  const topA = profileA.entries.filter(e => e.rating >= 4.5);
  const topB = profileB.entries.filter(e => e.rating >= 4.5);
  const bSeenSet = new Set(profileB.entries.map(e => `${e.name.toLowerCase()}-${e.year}`));
  const aSeenSet = new Set(profileA.entries.map(e => `${e.name.toLowerCase()}-${e.year}`));

  const bInfluencedByA = topA
    .filter(e => bSeenSet.has(`${e.name.toLowerCase()}-${e.year}`))
    .map(e => ({ name: e.name, year: e.year, rating: e.rating }));

  const aInfluencedByB = topB
    .filter(e => aSeenSet.has(`${e.name.toLowerCase()}-${e.year}`))
    .map(e => ({ name: e.name, year: e.year, rating: e.rating }));

  const aInfluenceScore = topB.length > 0 ? Math.round((aInfluencedByB.length / topB.length) * 100) : 0;
  const bInfluenceScore = topA.length > 0 ? Math.round((bInfluencedByA.length / topA.length) * 100) : 0;

  return {
    divisiveAgreements,
    dealbreakers,
    influenceMap: {
      aInfluencedByB: aInfluencedByB.slice(0, 8),
      bInfluencedByA: bInfluencedByA.slice(0, 8),
      aInfluenceScore,
      bInfluenceScore,
    },
  };
}
