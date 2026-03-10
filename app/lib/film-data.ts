import { FilmRecommendation } from './types';

// Genre mapping based on common film characteristics (simplified for MVP)
// In a real app this would come from an API
export const FILM_GENRE_MAP: Record<string, string[]> = {
  // Using film name keywords as a rough genre proxy
};

// Curated recommendation pool
export const CURATED_FILMS: FilmRecommendation[] = [
  { name: "In the Mood for Love", year: 2000, genres: ["Romance", "Drama"], director: "Wong Kar-wai", reason: "A masterpiece of restrained longing" },
  { name: "Stalker", year: 1979, genres: ["Sci-Fi", "Drama"], director: "Andrei Tarkovsky", reason: "Meditative science fiction at its finest" },
  { name: "Chungking Express", year: 1994, genres: ["Romance", "Drama", "Comedy"], director: "Wong Kar-wai", reason: "Electric, romantic, unforgettable" },
  { name: "Paris, Texas", year: 1984, genres: ["Drama", "Road"], director: "Wim Wenders", reason: "A haunting journey through the American landscape" },
  { name: "The Double Life of Véronique", year: 1991, genres: ["Drama", "Mystery"], director: "Krzysztof Kieślowski", reason: "Ethereal and deeply moving" },
  { name: "Yi Yi", year: 2000, genres: ["Drama", "Family"], director: "Edward Yang", reason: "A sweeping portrait of modern life" },
  { name: "Persona", year: 1966, genres: ["Drama", "Psychological"], director: "Ingmar Bergman", reason: "Identity dissolved on celluloid" },
  { name: "The Spirit of the Beehive", year: 1973, genres: ["Drama"], director: "Víctor Erice", reason: "Childhood wonder through a Spanish lens" },
  { name: "Harakiri", year: 1962, genres: ["Drama", "Action"], director: "Masaki Kobayashi", reason: "Samurai cinema at its most devastating" },
  { name: "Cleo from 5 to 7", year: 1962, genres: ["Drama"], director: "Agnès Varda", reason: "Real-time existential beauty" },
  { name: "Rear Window", year: 1954, genres: ["Thriller", "Mystery"], director: "Alfred Hitchcock", reason: "The master of suspense at his peak" },
  { name: "Memories of Murder", year: 2003, genres: ["Thriller", "Crime"], director: "Bong Joon-ho", reason: "A chilling procedural masterwork" },
  { name: "The Umbrellas of Cherbourg", year: 1964, genres: ["Musical", "Romance"], director: "Jacques Demy", reason: "Every word is sung, every frame is art" },
  { name: "A Brighter Summer Day", year: 1991, genres: ["Drama", "Crime"], director: "Edward Yang", reason: "Epic coming-of-age in 1960s Taiwan" },
  { name: "Solaris", year: 1972, genres: ["Sci-Fi", "Drama"], director: "Andrei Tarkovsky", reason: "Love and memory among the stars" },
  { name: "The 400 Blows", year: 1959, genres: ["Drama", "Coming-of-Age"], director: "François Truffaut", reason: "The birth of the French New Wave" },
  { name: "Spirited Away", year: 2001, genres: ["Animation", "Fantasy"], director: "Hayao Miyazaki", reason: "Animation as pure imagination" },
  { name: "The Night of the Hunter", year: 1955, genres: ["Thriller", "Film-Noir"], director: "Charles Laughton", reason: "A fairy tale nightmare" },
  { name: "Come and See", year: 1985, genres: ["War", "Drama"], director: "Elem Klimov", reason: "The most devastating war film ever made" },
  { name: "Fallen Angels", year: 1995, genres: ["Crime", "Romance"], director: "Wong Kar-wai", reason: "Neon-soaked nocturnal Hong Kong" },
  { name: "The Seventh Seal", year: 1957, genres: ["Drama", "Fantasy"], director: "Ingmar Bergman", reason: "Death plays chess" },
  { name: "Taste of Cherry", year: 1997, genres: ["Drama"], director: "Abbas Kiarostami", reason: "Minimalist profundity" },
  { name: "Mulholland Drive", year: 2001, genres: ["Mystery", "Thriller"], director: "David Lynch", reason: "Hollywood's dark dream" },
  { name: "The Passion of Joan of Arc", year: 1928, genres: ["Drama", "Historical"], director: "Carl Theodor Dreyer", reason: "Silent cinema's greatest close-up" },
  { name: "Mirror", year: 1975, genres: ["Drama", "Experimental"], director: "Andrei Tarkovsky", reason: "Memory as cinema" },
  { name: "Shoplifters", year: 2018, genres: ["Drama", "Crime"], director: "Hirokazu Kore-eda", reason: "Found family at its most tender" },
  { name: "The Handmaiden", year: 2016, genres: ["Thriller", "Romance"], director: "Park Chan-wook", reason: "Gorgeous, twisty, subversive" },
  { name: "Portrait of a Lady on Fire", year: 2019, genres: ["Romance", "Drama"], director: "Céline Sciamma", reason: "The female gaze, perfected" },
  { name: "Certified Copy", year: 2010, genres: ["Drama", "Romance"], director: "Abbas Kiarostami", reason: "Is any love original?" },
  { name: "Sunset Boulevard", year: 1950, genres: ["Drama", "Film-Noir"], director: "Billy Wilder", reason: "Hollywood eats its own" },
  { name: "Burning", year: 2018, genres: ["Mystery", "Drama"], director: "Lee Chang-dong", reason: "Slow-burn tension perfected" },
  { name: "All That Jazz", year: 1979, genres: ["Musical", "Drama"], director: "Bob Fosse", reason: "A dazzling dance with death" },
  { name: "Three Colors: Blue", year: 1993, genres: ["Drama"], director: "Krzysztof Kieślowski", reason: "Grief rendered in cobalt" },
  { name: "The Earrings of Madame de...", year: 1953, genres: ["Drama", "Romance"], director: "Max Ophüls", reason: "A jewel of a film, literally" },
  { name: "Happy Together", year: 1997, genres: ["Romance", "Drama"], director: "Wong Kar-wai", reason: "Love disintegrating in Buenos Aires" },
  { name: "Woman in the Dunes", year: 1964, genres: ["Drama", "Thriller"], director: "Hiroshi Teshigahara", reason: "Existential sand trap" },
  { name: "Pickpocket", year: 1959, genres: ["Crime", "Drama"], director: "Robert Bresson", reason: "Spare, precise, transcendent" },
  { name: "The Thin Red Line", year: 1998, genres: ["War", "Drama"], director: "Terrence Malick", reason: "War as philosophical meditation" },
  { name: "Jeanne Dielman", year: 1975, genres: ["Drama", "Experimental"], director: "Chantal Akerman", reason: "Domestic routine as radical cinema" },
  { name: "Close-Up", year: 1990, genres: ["Drama", "Documentary"], director: "Abbas Kiarostami", reason: "Truth and fiction intertwined" },
];

export function getRecommendations(
  seenFilms: Set<string>,
  topDirectors: string[],
  avgRating: number,
  count: number = 5
): FilmRecommendation[] {
  const unseen = CURATED_FILMS.filter(
    f => !seenFilms.has(f.name.toLowerCase())
  );

  // Score based on director match
  const scored = unseen.map(film => {
    let score = 0;
    if (topDirectors.some(d => film.director.toLowerCase().includes(d.toLowerCase()))) {
      score += 3;
    }
    // Slight randomization for variety
    score += Math.random() * 2;
    return { film, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map(s => s.film);
}
