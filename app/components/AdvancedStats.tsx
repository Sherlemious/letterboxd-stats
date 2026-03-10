"use client";
import { UserProfile } from '@/lib/types';
import { computeAdvancedSoloStats } from '@/lib/advanced-stats';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Skull, Heart, Globe, Compass, Flame, CalendarDays,
  TrendingUp, Star, Eye, Award, Info
} from 'lucide-react';

interface AdvancedStatsProps {
  profile: UserProfile;
}

const tooltipStyle = {
  background: 'hsl(30, 12%, 14%)',
  border: '1px solid hsl(30, 12%, 22%)',
  borderRadius: '2px',
  fontFamily: 'Special Elite',
  color: 'hsl(38, 50%, 85%)',
};

const Card = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="sepia-card rounded-sm p-6 worn-edge"
  >
    {children}
  </motion.div>
);

const SectionTitle = ({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) => (
  <div className="flex items-center gap-3 mb-6 mt-10 first:mt-0">
    <Icon className="w-5 h-5 text-primary" />
    <h3 className="text-xl font-display font-bold text-foreground uppercase tracking-wider">{children}</h3>
    <div className="flex-1 border-t border-border" />
  </div>
);

const AdvancedStats = ({ profile }: AdvancedStatsProps) => {
  const stats = useMemo(
    () => computeAdvancedSoloStats(profile.entries, profile.diary, profile.metadata),
    [profile]
  );

  return (
    <div className="space-y-6">
      {/* Enrichment notice */}
      <Card delay={0}>
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground font-typewriter">
            Advanced stats enriched {stats.enrichedCount} of {stats.totalCount} films from our metadata database.
            {stats.enrichedCount < stats.totalCount * 0.3 && " Some features may be limited with fewer matched films."}
            {profile.diary.length > 0 && ` Diary data: ${profile.diary.length} entries loaded.`}
            {profile.diary.length === 0 && " Upload the full zip export for diary-based features (rewatches, streaks, seasonal patterns)."}
          </p>
        </div>
      </Card>

      {/* ═══ TASTE PROFILING ═══ */}
      <SectionTitle icon={Compass}>Taste Profiling</SectionTitle>

      {/* Contrarian Score */}
      <Card delay={0.1}>
        <h4 className="font-display text-lg text-primary mb-3 flex items-center gap-2">
          <Skull className="w-5 h-5" /> Contrarian Score
        </h4>
          <div className="flex items-center gap-4 mb-4">
          <div className="text-3xl sm:text-4xl font-display font-bold text-foreground">{stats.contrarianScore.toFixed(1)}</div>
          <div>
            <p className="font-typewriter text-sm text-primary">{stats.contrarianLabel}</p>
            <p className="text-xs text-muted-foreground font-body">Average deviation from Letterboxd consensus</p>
          </div>
        </div>
        {stats.contrarianFilms.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground font-typewriter mb-2 uppercase tracking-widest">Most contrarian takes:</p>
            <div className="space-y-2">
              {stats.contrarianFilms.slice(0, 5).map((f, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-typewriter text-foreground truncate min-w-0">{f.name} <span className="text-muted-foreground">({f.year})</span></span>
                  <span className="font-typewriter text-[10px] sm:text-xs shrink-0 ml-2">
                    You: <span className={f.diff > 0 ? 'text-primary' : 'text-accent'}>{f.userRating}★</span>
                    {' · '}Avg: {f.avgRating}★
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Genre Mood Map */}
      {stats.genreMoodMap.length > 0 && (
        <Card delay={0.15}>
          <h4 className="font-display text-lg text-primary mb-3 flex items-center gap-2">
            <Flame className="w-5 h-5" /> Genre Mood Map
          </h4>
          <p className="text-xs text-muted-foreground font-typewriter mb-4">Your average rating by genre — what speaks to you?</p>
          <div className="space-y-2">
            {stats.genreMoodMap.slice(0, 12).map((g) => {
              const deviation = g.avgRating - (stats.enrichedCount > 0 ? stats.contrarianFilms.reduce((s, f) => s + f.userRating, 0) / Math.max(stats.contrarianFilms.length, 1) : 3.5);
              return (
                <div key={g.genre} className="flex items-center gap-3">
                  <span className="font-typewriter text-xs sm:text-sm text-muted-foreground w-16 sm:w-24 text-right truncate sm:w-24 text-right truncate">{g.genre}</span>
                  <div className="flex-1 h-4 bg-secondary rounded-sm overflow-hidden relative">
                    <div
                      className="h-full rounded-sm transition-all"
                      style={{
                        width: `${(g.avgRating / 5) * 100}%`,
                        backgroundColor: g.avgRating >= 4 ? 'hsl(36, 80%, 55%)' : g.avgRating >= 3 ? 'hsl(30, 60%, 40%)' : 'hsl(18, 70%, 45%)',
                      }}
                    />
                  </div>
                  <span className="font-typewriter text-xs text-foreground w-12 text-right">{g.avgRating}★</span>
                  <span className="font-typewriter text-[10px] text-muted-foreground w-6">({g.count})</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Auteur Loyalty */}
      {stats.auteurLoyalty.filter(d => d.count >= 2).length > 0 && (
        <Card delay={0.2}>
          <h4 className="font-display text-lg text-primary mb-3 flex items-center gap-2">
            <Eye className="w-5 h-5" /> Auteur Loyalty
          </h4>
          <p className="text-xs text-muted-foreground font-typewriter mb-4">Directors you keep returning to (2+ films)</p>
          <div className="space-y-3">
            {stats.auteurLoyalty.filter(d => d.count >= 2).slice(0, 10).map((d, i) => (
              <div key={i} className="border-b border-border pb-2 last:border-0">
                <div className="flex justify-between items-center">
                  <span className="font-typewriter text-sm text-foreground">{d.director}</span>
                  <span className="font-typewriter text-xs text-primary">{d.count} films · {d.avgRating}★ avg</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 truncate">{d.films.join(', ')}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recency Bias */}
      <Card delay={0.25}>
        <h4 className="font-display text-lg text-primary mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" /> Recency Bias Detector
        </h4>
        <p className="font-typewriter text-sm text-foreground italic mb-3">"{stats.recencyBias.label}"</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-secondary rounded-sm">
            <p className="text-2xl font-display font-bold text-foreground">{stats.recencyBias.oldAvg}★</p>
            <p className="text-xs font-typewriter text-muted-foreground">Pre-2000 avg</p>
          </div>
          <div className="text-center p-3 bg-secondary rounded-sm">
            <p className="text-2xl font-display font-bold text-foreground">{stats.recencyBias.newAvg}★</p>
            <p className="text-xs font-typewriter text-muted-foreground">2000+ avg</p>
          </div>
        </div>
      </Card>

      {/* ═══ WATCHING BEHAVIOR ═══ */}
      {profile.diary.length > 0 && (
        <>
          <SectionTitle icon={CalendarDays}>Watching Behavior</SectionTitle>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rewatch Rate */}
            <Card delay={0.3}>
              <h4 className="font-display text-lg text-primary mb-3">Rewatch Rate</h4>
              <div className="text-4xl font-display font-bold text-foreground mb-1">{stats.rewatchRate}%</div>
              <p className="text-xs text-muted-foreground font-typewriter">
                {stats.rewatchCount} rewatches out of {profile.diary.length} diary entries
              </p>
            </Card>

            {/* Binge Streak */}
            <Card delay={0.35}>
              <h4 className="font-display text-lg text-primary mb-3">Longest Binge Streak</h4>
              <div className="text-4xl font-display font-bold text-foreground mb-1">{stats.bingeStreak.days} days</div>
              {stats.bingeStreak.startDate && (
                <p className="text-xs text-muted-foreground font-typewriter">
                  {stats.bingeStreak.startDate} → {stats.bingeStreak.endDate}
                </p>
              )}
            </Card>
          </div>

          {/* Seasonal Patterns */}
          <Card delay={0.4}>
            <h4 className="font-display text-lg text-primary mb-4">Seasonal Patterns</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.seasonalPatterns}>
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'hsl(38, 50%, 85%)', fontSize: 11, fontFamily: 'Special Elite' }}
                    axisLine={{ stroke: 'hsl(30, 12%, 22%)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(30, 15%, 50%)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="hsl(36, 80%, 55%)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {stats.seasonalPatterns.some(s => s.topGenre) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {stats.seasonalPatterns.filter(s => s.topGenre && s.count > 0).map(s => (
                  <span key={s.month} className="text-[10px] font-typewriter text-muted-foreground bg-secondary px-2 py-1 rounded-sm">
                    {s.month}: {s.topGenre}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {/* ═══ FUN / SHAREABLE ═══ */}
      <SectionTitle icon={Award}>Fun & Shareable</SectionTitle>

      {/* Film Snob Index */}
      <Card delay={0.45}>
        <h4 className="font-display text-lg text-primary mb-3 flex items-center gap-2">
          <Star className="w-5 h-5" /> Film Snob Index
        </h4>
        <div className="text-3xl font-display font-bold text-foreground mb-1">{stats.filmSnobIndex.label}</div>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div className="text-center p-3 bg-secondary rounded-sm">
            <p className="text-xl font-display font-bold text-foreground">{stats.filmSnobIndex.pre1980Pct}%</p>
            <p className="text-xs font-typewriter text-muted-foreground">Pre-1980 films</p>
          </div>
          <div className="text-center p-3 bg-secondary rounded-sm">
            <p className="text-xl font-display font-bold text-foreground">{stats.filmSnobIndex.nonEnglishPct}%</p>
            <p className="text-xs font-typewriter text-muted-foreground">Non-English films*</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">*based on {stats.enrichedCount} matched films</p>
      </Card>

      {/* Director Loyalty Tier List */}
      {stats.directorTiers.length > 0 && (
        <Card delay={0.5}>
          <h4 className="font-display text-lg text-primary mb-4 flex items-center gap-2">
            <Award className="w-5 h-5" /> Director Loyalty Tier List
          </h4>
          <div className="space-y-4">
            {stats.directorTiers.map(({ tier, directors }) => (
              <div key={tier}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`font-display text-xl font-bold w-8 text-center ${
                    tier === 'S' ? 'text-primary' : tier === 'A' ? 'text-foreground' : 'text-muted-foreground'
                  }`}>{tier}</span>
                  <div className="flex-1 border-t border-border" />
                </div>
                <div className="flex flex-wrap gap-2 ml-4 sm:ml-10">
                  {directors.map((d, i) => (
                    <span key={i} className="font-typewriter text-xs bg-secondary border border-border px-3 py-1.5 rounded-sm text-foreground">
                      {d.director} <span className="text-muted-foreground">({d.count} · {d.avgRating}★)</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Film Passport */}
      {stats.filmPassport.length > 0 && (
        <Card delay={0.55}>
          <h4 className="font-display text-lg text-primary mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" /> Film Passport
          </h4>
          <p className="text-xs text-muted-foreground font-typewriter mb-4">Countries of origin for your rated films</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {stats.filmPassport.map((c, i) => (
              <div key={i} className="flex items-center gap-2 bg-secondary rounded-sm px-3 py-2">
                <span className="text-xl">{c.flag}</span>
                <div>
                  <p className="font-typewriter text-xs text-foreground">{c.country}</p>
                  <p className="font-typewriter text-[10px] text-muted-foreground">{c.count} films</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Blind Spots */}
      {stats.blindSpots.length > 0 && (
        <Card delay={0.6}>
          <h4 className="font-display text-lg text-primary mb-3 flex items-center gap-2">
            <Heart className="w-5 h-5" /> Cinematic Blind Spots
          </h4>
          <p className="text-xs text-muted-foreground font-typewriter mb-3">Acclaimed films you haven't rated yet</p>
          <div className="space-y-3">
            {stats.blindSpots.map((f, i) => (
              <div key={i} className="ticket-stub pl-5 py-2">
                <p className="font-typewriter text-sm text-foreground">
                  {f.name} <span className="text-muted-foreground">({f.year})</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">dir. {f.director}</p>
                <p className="text-xs text-primary/80 italic mt-1">{f.reason}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdvancedStats;
