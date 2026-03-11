"use client";
import { useCallback, useState } from 'react';
import { Upload, User, Loader2 } from 'lucide-react';
import { parseLetterboxdCSV, parseDiaryCSV } from '@/lib/csv-parser';
import { extractFromZip } from '@/lib/zip-extractor';
import { enrichFilmsWithTMDB, getTmdbApiKey, EnrichmentProgress } from '@/lib/tmdb';
import { UserProfile, FilmMeta } from '@/lib/types';
import { filmKey } from '@/lib/utils';
import { motion } from 'framer-motion';

interface FileUploadProps {
  onProfileAdd: (profile: UserProfile) => void;
}

const FileUpload = ({ onProfileAdd }: FileUploadProps) => {
  const [name, setName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<EnrichmentProgress | null>(null);

  const enrichAndAdd = useCallback(
    async (entries: ReturnType<typeof parseLetterboxdCSV>, diary: ReturnType<typeof parseDiaryCSV>) => {
      // 1. Hardcoded metadata as initial fallback (lazy-loaded — 44KB only when needed)
      const metadata = new Map<string, FilmMeta>();
      const { lookupFilm } = await import('@/lib/film-metadata');
      entries.forEach(e => {
        const fallback = lookupFilm(e.name, e.year);
        if (fallback) metadata.set(filmKey(e.name, e.year), fallback);
      });

      // 2. DB lookup — overrides hardcoded data where available (free, fast)
      try {
        setEnrichProgress({ current: 0, total: entries.length, status: 'Checking database...' });
        const res = await fetch('/api/movies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ films: entries.map(e => ({ name: e.name, year: e.year })) }),
        });
        if (res.ok) {
          const dbData: Record<string, FilmMeta> = await res.json();
          Object.entries(dbData).forEach(([key, meta]) => metadata.set(key, meta));
        }
      } catch {
        // DB unavailable — silently continue with existing metadata
      } finally {
        setEnrichProgress(null);
      }

      // 3. TMDB for films still missing metadata (only if user has an API key)
      if (getTmdbApiKey()) {
        const unenriched = entries.filter(e => !metadata.has(filmKey(e.name, e.year)));
        if (unenriched.length > 0) {
          setEnrichProgress({ current: 0, total: unenriched.length, status: 'Starting TMDB enrichment...' });
          const tmdbData = await enrichFilmsWithTMDB(
            unenriched.map(e => ({ name: e.name, year: e.year })),
            (progress) => setEnrichProgress(progress),
          );
          tmdbData.forEach((meta, key) => metadata.set(key, meta));

          // Save newly fetched TMDB data back to DB so future users benefit (fire-and-forget)
          if (tmdbData.size > 0) {
            const filmsToSave = [...tmdbData.entries()]
              .map(([key, meta]) => {
                const entry = unenriched.find(e => filmKey(e.name, e.year) === key);
                return entry ? { name: entry.name, year: entry.year, meta } : null;
              })
              .filter((f): f is { name: string; year: number; meta: FilmMeta } => f !== null);

            fetch('/api/movies', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ films: filmsToSave }),
            }).catch(() => {}); // intentionally fire-and-forget
          }
        }
        setEnrichProgress(null);
      }

      onProfileAdd({
        id: crypto.randomUUID(),
        name: name.trim(),
        entries,
        diary,
        metadata,
      });
      setName('');
    },
    [name, onProfileAdd]
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (!name.trim()) {
        setError('Please enter a name first');
        return;
      }
      setError('');
      setLoading(true);

      try {
        let entries: ReturnType<typeof parseLetterboxdCSV>;
        let diary: ReturnType<typeof parseDiaryCSV> = [];

        if (file.name.endsWith('.zip')) {
          const { ratingsCSV, diaryCSV } = await extractFromZip(file);
          if (!ratingsCSV) {
            setError('No ratings.csv found in the zip file.');
            setLoading(false);
            return;
          }
          entries = parseLetterboxdCSV(ratingsCSV);
          diary = diaryCSV ? parseDiaryCSV(diaryCSV) : [];
        } else {
          const text = await file.text();
          entries = parseLetterboxdCSV(text);
        }

        if (entries.length === 0) {
          setError('No valid ratings found. Make sure it\'s a Letterboxd ratings export.');
          setLoading(false);
          return;
        }

        await enrichAndAdd(entries, diary);
      } catch (e) {
        setError('Failed to read file. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [name, enrichAndAdd]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-lg mx-auto"
    >
      <div className="mb-4">
        <label className="block text-sm font-typewriter text-muted-foreground mb-2 uppercase tracking-widest">
          Viewer Name
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Martin"
            className="w-full bg-secondary border border-border rounded pl-10 pr-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-typewriter"
          />
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-sm p-12 text-center transition-all cursor-pointer worn-edge ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
      >
        <input
          type="file"
          accept=".csv,.zip"
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {loading ? (
          <div>
            <Loader2 className="w-8 h-8 mx-auto mb-3 text-primary animate-spin" />
            {enrichProgress && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground font-typewriter">{enrichProgress.status}</p>
                <div className="w-full h-1.5 bg-secondary rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${enrichProgress.total > 0 ? (enrichProgress.current / enrichProgress.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground font-typewriter mt-1">
                  {enrichProgress.current}/{enrichProgress.total} films
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 mx-auto mb-3 text-primary" />
            <p className="font-typewriter text-sm text-foreground mb-1">
              Drop your ratings.csv or export zip here
            </p>
            <p className="text-xs text-muted-foreground font-body">
              Accepts .csv or the full .zip from Letterboxd export
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-accent font-typewriter">{error}</p>
      )}
    </motion.div>
  );
};

export default FileUpload;
