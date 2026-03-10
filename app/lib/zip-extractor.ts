import JSZip from 'jszip';

export interface ZipExtractResult {
  ratingsCSV: string | null;
  diaryCSV: string | null;
}

export async function extractFromZip(file: File): Promise<ZipExtractResult> {
  const zip = await JSZip.loadAsync(file);

  let ratingsCSV: string | null = null;
  let diaryCSV: string | null = null;

  // Look for ratings.csv
  const ratingsFile = zip.file(/ratings\.csv$/i)[0];
  if (ratingsFile) {
    ratingsCSV = await ratingsFile.async('string');
  }

  // Look for diary.csv
  const diaryFile = zip.file(/diary\.csv$/i)[0];
  if (diaryFile) {
    diaryCSV = await diaryFile.async('string');
  }

  // Fallback: find any csv with ratings
  if (!ratingsCSV) {
    const csvFiles = zip.file(/\.csv$/i);
    for (const csvFile of csvFiles) {
      const content = await csvFile.async('string');
      if (content.includes('Rating') || content.includes('rating')) {
        ratingsCSV = content;
        break;
      }
    }
  }

  return { ratingsCSV, diaryCSV };
}

// Keep backward compat
export async function extractCSVFromZip(file: File): Promise<string | null> {
  const result = await extractFromZip(file);
  return result.ratingsCSV;
}
