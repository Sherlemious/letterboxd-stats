export interface LetterboxdEntry {
  date: string;
  name: string;
  year: number;
  letterboxdUri: string;
  rating: number;
}

export interface DiaryEntry extends LetterboxdEntry {
  rewatch: boolean;
  tags: string;
}

export interface UserProfile {
  id: string;
  name: string;
  entries: LetterboxdEntry[];
  diary: DiaryEntry[];
  metadata: Map<string, FilmMeta>; // enriched metadata keyed by "name-year"
}

export interface GenreStat {
  genre: string;
  count: number;
  avgRating: number;
}

export interface DirectorStat {
  director: string;
  count: number;
  avgRating: number;
  films: string[];
  tier?: string;
}

export interface YearStat {
  year: number;
  avgRating: number;
  count: number;
}

export interface DecadeStat {
  decade: string;
  count: number;
}

export interface ComparisonResult {
  overlapPercentage: number;
  sharedFilms: { name: string; year: number; ratings: Record<string, number> }[];
  agreements: { name: string; year: number; rating: number }[];
  disagreements: { name: string; year: number; ratings: Record<string, number> }[];
  compatibilityScore: number;
}

export interface FilmRecommendation {
  name: string;
  year: number;
  genres: string[];
  director: string;
  reason: string;
}

export interface FilmMeta {
  director: string;
  genres: string[];
  country: string;
  lbAvg: number; // Letterboxd average rating (approximate)
}

export interface AdvancedSoloStats {
  contrarianScore: number;
  contrarianLabel: string;
  contrarianFilms: { name: string; year: number; userRating: number; avgRating: number; diff: number }[];
  auteurLoyalty: DirectorStat[];
  genreMoodMap: GenreStat[];
  recencyBias: { label: string; oldAvg: number; newAvg: number; biasScore: number };
  rewatchRate: number;
  rewatchCount: number;
  bingeStreak: { days: number; startDate: string; endDate: string };
  seasonalPatterns: { month: string; count: number; topGenre?: string }[];
  filmSnobIndex: { score: number; label: string; pre1980Pct: number; nonEnglishPct: number };
  blindSpots: FilmRecommendation[];
  directorTiers: { tier: string; directors: DirectorStat[] }[];
  filmPassport: { country: string; count: number; flag: string }[];
  enrichedCount: number;
  totalCount: number;
}

export interface AdvancedCompareStats {
  divisiveAgreements: { name: string; year: number; ratingA: number; ratingB: number; avgRating: number }[];
  dealbreakers: { name: string; year: number; ratingA: number; ratingB: number; diff: number }[];
  influenceMap: {
    aInfluencedByB: { name: string; year: number; rating: number }[];
    bInfluencedByA: { name: string; year: number; rating: number }[];
    aInfluenceScore: number;
    bInfluenceScore: number;
  };
}
