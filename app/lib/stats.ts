import { LetterboxdEntry, YearStat, DecadeStat, ComparisonResult } from './types';

export function getRatingDistribution(entries: LetterboxdEntry[]): Record<number, number> {
  const dist: Record<number, number> = {};
  for (let r = 0.5; r <= 5; r += 0.5) {
    dist[r] = 0;
  }
  entries.forEach(e => {
    if (dist[e.rating] !== undefined) dist[e.rating]++;
  });
  return dist;
}

export function getAvgRating(entries: LetterboxdEntry[]): number {
  if (entries.length === 0) return 0;
  return entries.reduce((sum, e) => sum + e.rating, 0) / entries.length;
}

export function getAvgRatingByYear(entries: LetterboxdEntry[]): YearStat[] {
  const byYear: Record<number, { sum: number; count: number }> = {};
  entries.forEach(e => {
    if (!e.year) return;
    if (!byYear[e.year]) byYear[e.year] = { sum: 0, count: 0 };
    byYear[e.year].sum += e.rating;
    byYear[e.year].count++;
  });
  return Object.entries(byYear)
    .map(([year, data]) => ({
      year: parseInt(year),
      avgRating: Math.round((data.sum / data.count) * 100) / 100,
      count: data.count,
    }))
    .filter(y => y.year > 1900)
    .sort((a, b) => a.year - b.year);
}

export function getDecadeDistribution(entries: LetterboxdEntry[]): DecadeStat[] {
  const decades: Record<string, number> = {};
  entries.forEach(e => {
    if (!e.year) return;
    const decade = `${Math.floor(e.year / 10) * 10}s`;
    decades[decade] = (decades[decade] || 0) + 1;
  });
  return Object.entries(decades)
    .map(([decade, count]) => ({ decade, count }))
    .sort((a, b) => a.decade.localeCompare(b.decade));
}

export function getTopDirectorsFromEntries(entries: LetterboxdEntry[]): string[] {
  // Without genre/director data in CSV, we return empty
  // This would be enhanced with external data
  return [];
}

export function getTasteSummary(entries: LetterboxdEntry[]): string {
  const avg = getAvgRating(entries);
  const decades = getDecadeDistribution(entries);
  const topDecade = decades.sort((a, b) => b.count - a.count)[0];
  const totalFilms = entries.length;
  const fiveStars = entries.filter(e => e.rating === 5).length;
  const oneStars = entries.filter(e => e.rating <= 1).length;
  const highRated = entries.filter(e => e.rating >= 4).length;
  const generosity = highRated / totalFilms;

  let personality = "";
  if (avg >= 4) personality = "a generous soul who sees the best in cinema";
  else if (avg >= 3.5) personality = "a thoughtful cinephile with refined taste";
  else if (avg >= 3) personality = "a discerning viewer who doesn't hand out stars easily";
  else personality = "a harsh critic — the Simon Cowell of cinema";

  let eraNote = "";
  if (topDecade) {
    eraNote = ` Their heart belongs to the ${topDecade.decade}`;
    if (topDecade.decade === "2020s" || topDecade.decade === "2010s") {
      eraNote += " — a modern moviegoer keeping up with the times.";
    } else if (topDecade.decade <= "1970s") {
      eraNote += " — a true classicist with old-school sensibilities.";
    } else {
      eraNote += ".";
    }
  }

  let extremes = "";
  if (fiveStars > 10) extremes += ` They've found ${fiveStars} perfect films.`;
  if (oneStars > 5) extremes += ` They've also condemned ${oneStars} films to the gutter.`;

  return `With ${totalFilms} films rated at an average of ${avg.toFixed(2)} stars, this is ${personality}.${eraNote}${extremes}${generosity > 0.5 ? " A true optimist at the movies." : generosity < 0.25 ? " Not easily impressed." : ""}`;
}

export function compareProfiles(
  profileA: { name: string; entries: LetterboxdEntry[] },
  profileB: { name: string; entries: LetterboxdEntry[] }
): ComparisonResult {
  const mapA = new Map<string, LetterboxdEntry>();
  const mapB = new Map<string, LetterboxdEntry>();

  profileA.entries.forEach(e => mapA.set(`${e.name.toLowerCase()}-${e.year}`, e));
  profileB.entries.forEach(e => mapB.set(`${e.name.toLowerCase()}-${e.year}`, e));

  const allFilms = new Set([...mapA.keys(), ...mapB.keys()]);
  const sharedKeys = [...mapA.keys()].filter(k => mapB.has(k));

  const overlapPercentage = Math.round((sharedKeys.length / allFilms.size) * 100);

  const sharedFilms = sharedKeys.map(k => ({
    name: mapA.get(k)!.name,
    year: mapA.get(k)!.year,
    ratings: {
      [profileA.name]: mapA.get(k)!.rating,
      [profileB.name]: mapB.get(k)!.rating,
    },
  }));

  const agreements = sharedFilms
    .filter(f => Math.abs(f.ratings[profileA.name] - f.ratings[profileB.name]) <= 0.5)
    .map(f => ({ name: f.name, year: f.year, rating: f.ratings[profileA.name] }));

  const disagreements = sharedFilms
    .filter(f => Math.abs(f.ratings[profileA.name] - f.ratings[profileB.name]) >= 2)
    .sort((a, b) => {
      const diffA = Math.abs(a.ratings[profileA.name] - a.ratings[profileB.name]);
      const diffB = Math.abs(b.ratings[profileA.name] - b.ratings[profileB.name]);
      return diffB - diffA;
    });

  // Compatibility score: weighted average of overlap + agreement rate
  const agreementRate = sharedKeys.length > 0 ? agreements.length / sharedKeys.length : 0;
  const overlapFactor = Math.min(overlapPercentage / 50, 1); // Max contribution at 50% overlap
  const compatibilityScore = Math.round((agreementRate * 70 + overlapFactor * 30));

  return {
    overlapPercentage,
    sharedFilms,
    agreements,
    disagreements,
    compatibilityScore,
  };
}
