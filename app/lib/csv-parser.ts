import Papa from 'papaparse';
import { LetterboxdEntry, DiaryEntry } from './types';

export function parseLetterboxdCSV(csvText: string): LetterboxdEntry[] {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data
    .map((row: any) => {
      const rating = parseFloat(row['Rating'] || row['rating'] || '0');
      const year = parseInt(row['Year'] || row['year'] || '0', 10);
      const name = row['Name'] || row['name'] || row['Film'] || row['Title'] || '';
      const date = row['Date'] || row['date'] || row['Watched Date'] || '';
      const uri = row['Letterboxd URI'] || row['letterboxd_uri'] || '';

      if (!name || rating === 0) return null;

      return {
        date,
        name: name.trim(),
        year,
        letterboxdUri: uri,
        rating,
      };
    })
    .filter(Boolean) as LetterboxdEntry[];
}

export function parseDiaryCSV(csvText: string): DiaryEntry[] {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data
    .map((row: any) => {
      const name = row['Name'] || row['name'] || row['Film'] || '';
      const date = row['Watched Date'] || row['Date'] || row['date'] || '';
      const year = parseInt(row['Year'] || row['year'] || '0', 10);
      const rating = parseFloat(row['Rating'] || row['rating'] || '0');
      const rewatch = (row['Rewatch'] || row['rewatch'] || '').toString().toLowerCase() === 'yes';
      const tags = row['Tags'] || row['tags'] || '';
      const uri = row['Letterboxd URI'] || row['letterboxd_uri'] || '';

      if (!name) return null;

      return {
        date,
        name: name.trim(),
        year,
        letterboxdUri: uri,
        rating,
        rewatch,
        tags,
      };
    })
    .filter(Boolean) as DiaryEntry[];
}
