"use client";
import { UserProfile } from '@/lib/types';
import { compareProfiles } from '@/lib/stats';
import { computeAdvancedCompareStats } from '@/lib/advanced-stats';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Heart, Swords, Star, Percent, Zap, Target, ArrowRightLeft } from 'lucide-react';

interface CompareViewProps {
  profiles: UserProfile[];
}

const CompareView = ({ profiles }: CompareViewProps) => {
  const profileA = profiles.length >= 2 ? profiles[0] : null;
  const profileB = profiles.length >= 2 ? profiles[1] : null;
  const result = useMemo(
    () => profileA && profileB ? compareProfiles(profileA, profileB) : null,
    [profileA, profileB]
  );
  // Merge metadata from both profiles
  const mergedMetadata = useMemo(() => {
    const merged = new Map<string, import('@/lib/types').FilmMeta>();
    if (profileA) profileA.metadata.forEach((v, k) => merged.set(k, v));
    if (profileB) profileB.metadata.forEach((v, k) => merged.set(k, v));
    return merged;
  }, [profileA, profileB]);
  const advanced = useMemo(
    () => profileA && profileB ? computeAdvancedCompareStats(profileA, profileB, mergedMetadata) : null,
    [profileA, profileB, mergedMetadata]
  );

  if (!profileA || !profileB || !result || !advanced) {
    return (
      <div className="text-center py-16">
        <p className="font-typewriter text-muted-foreground">Upload at least 2 profiles to compare</p>
      </div>
    );
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Cinematic Soulmates";
    if (score >= 60) return "Film Buddies";
    if (score >= 40) return "Agreeable Strangers";
    if (score >= 20) return "Polite Disagreement";
    return "Opposing Critics";
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 80) return "🎬";
    if (score >= 60) return "🍿";
    if (score >= 40) return "🎞️";
    if (score >= 20) return "🎭";
    return "⚔️";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-1">
          {profileA.name} <span className="text-primary">&</span> {profileB.name}
        </h2>
        <p className="text-muted-foreground font-typewriter text-sm">Taste Comparison</p>
      </div>

      {/* Compatibility Score */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="sepia-card rounded-sm p-8 worn-edge text-center">
        <p className="font-typewriter text-xs text-muted-foreground uppercase tracking-widest mb-3">Compatibility Score</p>
        <div className="text-5xl sm:text-6xl font-display font-bold text-primary mb-2">{result.compatibilityScore}%</div>
        <p className="font-typewriter text-lg text-foreground">
          {getScoreEmoji(result.compatibilityScore)} {getScoreLabel(result.compatibilityScore)}
        </p>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Percent, value: `${result.overlapPercentage}%`, label: "Film Overlap", delay: 0.3 },
          { icon: Heart, value: result.agreements.length, label: "Agreements", delay: 0.35 },
          { icon: Swords, value: result.disagreements.length, label: "Disagreements", delay: 0.4, accent: true },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: stat.delay }} className="sepia-card rounded-sm p-5 worn-edge text-center">
            <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.accent ? 'text-accent' : 'text-primary'}`} />
            <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
            <p className="text-xs font-typewriter text-muted-foreground mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Dealbreaker Films */}
      {advanced.dealbreakers.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }} className="sepia-card rounded-sm p-6 worn-edge">
          <h3 className="font-display text-lg text-accent mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" /> Dealbreaker Films
          </h3>
          <p className="text-xs text-muted-foreground font-typewriter mb-3">Films with 2.5+ star difference — cinematic irreconcilable differences</p>
          <div className="space-y-3">
            {advanced.dealbreakers.slice(0, 6).map((film, i) => (
              <div key={i} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="font-typewriter text-sm text-foreground truncate">{film.name}</p>
                  <p className="text-xs text-muted-foreground">{film.year}</p>
                </div>
                <div className="flex items-center gap-4 ml-3 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{profileA.name}</p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }, (_, j) => (
                        <Star key={j} className={`w-2.5 h-2.5 ${j < film.ratingA ? 'star-filled fill-primary' : 'star-empty'}`} />
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{profileB.name}</p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }, (_, j) => (
                        <Star key={j} className={`w-2.5 h-2.5 ${j < film.ratingB ? 'star-filled fill-primary' : 'star-empty'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Biggest Disagreements */}
      {result.disagreements.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="sepia-card rounded-sm p-6 worn-edge">
          <h3 className="font-display text-lg text-accent mb-4 flex items-center gap-2">
            <Swords className="w-5 h-5" /> Biggest Disagreements
          </h3>
          <div className="space-y-3">
            {result.disagreements.slice(0, 8).map((film, i) => (
              <div key={i} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="font-typewriter text-sm text-foreground truncate">{film.name}</p>
                  <p className="text-xs text-muted-foreground">{film.year}</p>
                </div>
                <div className="flex items-center gap-4 ml-3 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{profileA.name}</p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }, (_, j) => (
                        <Star key={j} className={`w-2.5 h-2.5 ${j < film.ratings[profileA.name] ? 'star-filled fill-primary' : 'star-empty'}`} />
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{profileB.name}</p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }, (_, j) => (
                        <Star key={j} className={`w-2.5 h-2.5 ${j < film.ratings[profileB.name] ? 'star-filled fill-primary' : 'star-empty'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Films You Both Love */}
      {result.agreements.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="sepia-card rounded-sm p-6 worn-edge">
          <h3 className="font-display text-lg text-primary mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5" /> Films You Both Love
          </h3>
          <div className="space-y-2">
            {result.agreements.sort((a, b) => b.rating - a.rating).slice(0, 10).map((film, i) => (
              <div key={i} className="flex items-center justify-between">
                <p className="font-typewriter text-sm text-foreground truncate">
                  {film.name} <span className="text-muted-foreground">({film.year})</span>
                </p>
                <div className="flex gap-0.5 ml-2 shrink-0">
                  {Array.from({ length: 5 }, (_, j) => (
                    <Star key={j} className={`w-3 h-3 ${j < film.rating ? 'star-filled fill-primary' : 'star-empty'}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Taste Twin — Divisive Agreements */}
      {advanced.divisiveAgreements.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52 }} className="sepia-card rounded-sm p-6 worn-edge">
          <h3 className="font-display text-lg text-primary mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5" /> Taste Twin Proof
          </h3>
          <p className="text-xs text-muted-foreground font-typewriter mb-3">Films where you both agree, but disagree with the crowd</p>
          <div className="space-y-3">
            {advanced.divisiveAgreements.map((film, i) => (
              <div key={i} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="font-typewriter text-sm text-foreground truncate">{film.name}</p>
                  <p className="text-xs text-muted-foreground">{film.year}</p>
                </div>
                <div className="flex items-center gap-3 ml-3 shrink-0">
                  <span className="font-typewriter text-xs text-primary">You: {film.ratingA}★</span>
                  <span className="font-typewriter text-xs text-muted-foreground">Avg: {film.avgRating}★</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Influence Map */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="sepia-card rounded-sm p-6 worn-edge">
        <h3 className="font-display text-lg text-primary mb-3 flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5" /> Influence Map
        </h3>
        <p className="text-xs text-muted-foreground font-typewriter mb-4">How much of one person's favorites the other has seen</p>
        <div className="1 sm:grid-cols-grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-secondary rounded-sm">
            <p className="text-3xl font-display font-bold text-foreground">{advanced.influenceMap.bInfluenceScore}%</p>
            <p className="text-xs font-typewriter text-muted-foreground mt-1">
              {profileB.name} has seen {profileA.name}'s top films
            </p>
          </div>
          <div className="text-center p-4 bg-secondary rounded-sm">
            <p className="text-3xl font-display font-bold text-foreground">{advanced.influenceMap.aInfluenceScore}%</p>
            <p className="text-xs font-typewriter text-muted-foreground mt-1">
              {profileA.name} has seen {profileB.name}'s top films
            </p>
          </div>
        </div>
      </motion.div>

      {/* Agreement Heatmap */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="sepia-card rounded-sm p-6 worn-edge">
        <h3 className="font-display text-lg text-primary mb-4">Rating Agreement Heatmap</h3>
        <p className="text-xs text-muted-foreground font-typewriter mb-4">How often each pair of ratings occurs across shared films</p>
        <AgreementHeatmap sharedFilms={result.sharedFilms} nameA={profileA.name} nameB={profileB.name} />
      </motion.div>
    </motion.div>
  );
};

function AgreementHeatmap({ sharedFilms, nameA, nameB }: {
  sharedFilms: { ratings: Record<string, number> }[];
  nameA: string;
  nameB: string;
}) {
  const ratings = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
  const grid: Record<string, number> = {};

  sharedFilms.forEach(f => {
    const rA = f.ratings[nameA];
    const rB = f.ratings[nameB];
    const key = `${rA}-${rB}`;
    grid[key] = (grid[key] || 0) + 1;
  });

  const maxCount = Math.max(...Object.values(grid), 1);

  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        <div className="flex items-end mb-1 ml-12">
          <p className="text-xs text-muted-foreground font-typewriter text-center w-full">{nameB} →</p>
        </div>
        <div className="flex">
          <div className="flex flex-col items-end pr-2 pt-0">
            {ratings.map(rA => (
              <div key={rA} className="h-6 flex items-center">
                <span className="text-[10px] text-muted-foreground font-typewriter">{rA}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="flex mb-1">
              {ratings.map(rB => (
                <div key={rB} className="w-6 text-center">
                  <span className="text-[10px] text-muted-foreground font-typewriter">{rB}</span>
                </div>
              ))}
            </div>
            {ratings.map(rA => (
              <div key={rA} className="flex">
                {ratings.map(rB => {
                  const count = grid[`${rA}-${rB}`] || 0;
                  const intensity = count / maxCount;
                  return (
                    <div
                      key={rB}
                      className="w-6 h-6 border border-border/30 rounded-sm flex items-center justify-center"
                      style={{
                        backgroundColor: count > 0 ? `hsl(36, 80%, 55%, ${0.1 + intensity * 0.8})` : 'transparent',
                      }}
                      title={`${nameA}: ${rA}★, ${nameB}: ${rB}★ — ${count} films`}
                    >
                      {count > 0 && (
                        <span className="text-[8px] font-typewriter text-primary-foreground">{count}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center ml-6 mt-1">
          <span className="text-[10px] text-muted-foreground font-typewriter">{nameA} ↑</span>
        </div>
      </div>
    </div>
  );
}

export default CompareView;
