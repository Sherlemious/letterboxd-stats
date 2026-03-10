"use client";
import { useState, useEffect } from 'react';
import { getTmdbApiKey, setTmdbApiKey, clearTmdbApiKey, validateTmdbApiKey } from '@/lib/tmdb';
import { motion } from 'framer-motion';
import { Key, Check, X, Loader2, ExternalLink } from 'lucide-react';

const TmdbSettings = () => {
  const [apiKey, setApiKeyState] = useState('');
  const [saved, setSaved] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const existing = getTmdbApiKey();
    if (existing) {
      setHasKey(true);
      setApiKeyState(existing);
    }
  }, []);

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setError('');
    setValidating(true);

    const valid = await validateTmdbApiKey(apiKey.trim());
    setValidating(false);

    if (!valid) {
      setError('Invalid API key. Please check and try again.');
      return;
    }

    setTmdbApiKey(apiKey.trim());
    setHasKey(true);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleClear = () => {
    clearTmdbApiKey();
    setApiKeyState('');
    setHasKey(false);
    setSaved(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sepia-card rounded-sm p-6 worn-edge"
    >
      <h3 className="font-display text-lg text-primary mb-2 flex items-center gap-2">
        <Key className="w-5 h-5" /> TMDB API Key
      </h3>
      <p className="text-xs text-muted-foreground font-typewriter mb-1">
        Enables full metadata enrichment — genres, directors, countries, and ratings for all your films.
      </p>
      <a
        href="https://www.themoviedb.org/settings/api"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary font-typewriter inline-flex items-center gap-1 mb-4 hover:underline"
      >
        Get a free API key at TMDB <ExternalLink className="w-3 h-3" />
      </a>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKeyState(e.target.value)}
          placeholder="Enter your TMDB API key (v3 auth)"
          className="flex-1 bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-typewriter"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={validating || !apiKey.trim()}
            className="flex-1 sm:flex-none px-4 py-2 bg-primary text-primary-foreground rounded-sm font-typewriter text-sm disabled:opacity-50 flex items-center justify-center gap-1"
          >
            {validating ? <Loader2 className="w-3 h-3 animate-spin" /> : saved ? <Check className="w-3 h-3" /> : null}
            {saved ? 'Saved' : 'Save'}
          </button>
          {hasKey && (
            <button
              onClick={handleClear}
              className="px-3 py-2 border border-border rounded-sm text-muted-foreground hover:text-accent font-typewriter text-sm"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-accent font-typewriter">{error}</p>}
      {hasKey && !error && (
        <p className="mt-2 text-xs text-primary/70 font-typewriter flex items-center gap-1">
          <Check className="w-3 h-3" /> API key configured — films will be auto-enriched on upload
        </p>
      )}
    </motion.div>
  );
};

export default TmdbSettings;
