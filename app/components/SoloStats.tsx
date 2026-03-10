"use client";
import { UserProfile } from '@/lib/types';
import { getRatingDistribution, getAvgRating, getAvgRatingByYear, getDecadeDistribution, getTasteSummary } from '@/lib/stats';
import { getRecommendations } from '@/lib/film-data';
import AdvancedStats from '@/components/AdvancedStats';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Star, Film } from 'lucide-react';

interface SoloStatsProps {
  profile: UserProfile;
}

const tooltipStyle = {
  background: 'hsl(30, 12%, 14%)',
  border: '1px solid hsl(30, 12%, 22%)',
  borderRadius: '2px',
  fontFamily: 'Special Elite',
  color: 'hsl(38, 50%, 85%)',
};

const SoloStats = ({ profile }: SoloStatsProps) => {
  const dist = getRatingDistribution(profile.entries);
  const avg = getAvgRating(profile.entries);
  const byYear = getAvgRatingByYear(profile.entries);
  const decades = getDecadeDistribution(profile.entries);
  const summary = getTasteSummary(profile.entries);

  const distData = Object.entries(dist)
    .map(([rating, count]) => ({
      rating: `${rating}★`,
      count,
      ratingNum: parseFloat(rating),
    }))
    .sort((a, b) => a.ratingNum - b.ratingNum);

  const seenFilms = new Set(profile.entries.map(e => e.name.toLowerCase()));
  const recommendations = getRecommendations(seenFilms, [], avg, 5);

  const topRated = [...profile.entries]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-display font-bold text-foreground mb-1">{profile.name}</h2>
        <p className="text-muted-foreground font-typewriter text-sm">
          {profile.entries.length} films rated · avg {avg.toFixed(2)}★
          {profile.diary.length > 0 && ` · ${profile.diary.length} diary entries`}
        </p>
      </div>

      {/* Taste Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="sepia-card rounded-sm p-6 worn-edge">
        <h3 className="font-display text-lg text-primary mb-3 flex items-center gap-2">
          <Film className="w-5 h-5" /> Film Taste Profile
        </h3>
        <p className="font-typewriter text-sm text-foreground leading-relaxed italic">"{summary}"</p>
      </motion.div>

      {/* Rating Distribution */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="sepia-card rounded-sm p-6 worn-edge">
        <h3 className="font-display text-lg text-primary mb-4">Rating Distribution</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distData}>
              <XAxis dataKey="rating" tick={{ fill: 'hsl(38, 50%, 85%)', fontSize: 11, fontFamily: 'Special Elite' }} axisLine={{ stroke: 'hsl(30, 12%, 22%)' }} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(30, 15%, 50%)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="hsl(36, 80%, 55%)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Two column: Decades + Top Films */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="sepia-card rounded-sm p-6 worn-edge">
          <h3 className="font-display text-lg text-primary mb-4">Most Watched Decades</h3>
          <div className="space-y-2">
            {decades.sort((a, b) => b.count - a.count).map((d) => {
              const maxCount = Math.max(...decades.map(x => x.count));
              return (
                <div key={d.decade} className="flex items-center gap-3">
                  <span className="font-typewriter text-sm text-muted-foreground w-12">{d.decade}</span>
                  <div className="flex-1 h-3 bg-secondary rounded-sm overflow-hidden">
                    <div className="h-full bg-primary rounded-sm transition-all" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                  </div>
                  <span className="font-typewriter text-xs text-muted-foreground w-8 text-right">{d.count}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="sepia-card rounded-sm p-6 worn-edge">
          <h3 className="font-display text-lg text-primary mb-4">Highest Rated</h3>
          <div className="space-y-3">
            {topRated.map((film, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-typewriter text-sm text-foreground truncate">{film.name}</p>
                  <p className="text-xs text-muted-foreground">{film.year}</p>
                </div>
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  {Array.from({ length: 5 }, (_, j) => (
                    <Star key={j} className={`w-3 h-3 ${j < film.rating ? 'star-filled fill-primary' : 'star-empty'}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Avg Rating by Year */}
      {byYear.length > 5 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="sepia-card rounded-sm p-6 worn-edge">
          <h3 className="font-display text-lg text-primary mb-4">Average Rating by Release Year</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={byYear}>
                <XAxis dataKey="year" tick={{ fill: 'hsl(30, 15%, 50%)', fontSize: 10 }} axisLine={{ stroke: 'hsl(30, 12%, 22%)' }} tickLine={false} />
                <YAxis domain={[0, 5]} tick={{ fill: 'hsl(30, 15%, 50%)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="avgRating" stroke="hsl(36, 80%, 55%)" fill="hsl(36, 80%, 55%)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Films Per Year */}
      {byYear.length > 5 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="sepia-card rounded-sm p-6 worn-edge">
          <h3 className="font-display text-lg text-primary mb-4">Films Rated Per Release Year</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byYear}>
                <XAxis dataKey="year" tick={{ fill: 'hsl(30, 15%, 50%)', fontSize: 10 }} axisLine={{ stroke: 'hsl(30, 12%, 22%)' }} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(30, 15%, 50%)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="hsl(18, 70%, 45%)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Recommendations */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="sepia-card rounded-sm p-6 worn-edge">
        <h3 className="font-display text-lg text-primary mb-4">Recommended For You</h3>
        <div className="space-y-4">
          {recommendations.map((film, i) => (
            <div key={i} className="ticket-stub pl-5 py-2">
              <p className="font-typewriter text-sm text-foreground">
                {film.name} <span className="text-muted-foreground">({film.year})</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">dir. {film.director}</p>
              <p className="text-xs text-primary/80 italic mt-1">{film.reason}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ═══ ADVANCED STATS ═══ */}
      <div className="border-t border-border pt-8 mt-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-display font-bold text-foreground">Advanced Analysis</h2>
          <p className="text-sm font-typewriter text-muted-foreground mt-1">Deep-dive into your cinematic identity</p>
        </div>
        <AdvancedStats profile={profile} />
      </div>
    </motion.div>
  );
};

export default SoloStats;
