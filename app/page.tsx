"use client";

import { useState } from 'react';
import { useProfiles } from '@/hooks/use-profiles';
import { UserProfile } from '@/lib/types';
import FileUpload from '@/components/FileUpload';
import SoloStats from '@/components/SoloStats';
import CompareView from '@/components/CompareView';
import FilmGrain from '@/components/FilmGrain';

import { motion, AnimatePresence } from 'framer-motion';
import { X, BarChart3, GitCompareArrows, Clapperboard, Github, Globe } from 'lucide-react';

type Tab = 'upload' | 'solo' | 'compare';

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const { profiles, selectedId, selected, addProfile, removeProfile, setSelectedId } = useProfiles();

  const handleProfileAdd = (profile: UserProfile) => {
    addProfile(profile);
    setActiveTab('solo');
  };

  return (
    <div className="min-h-screen bg-background relative">
      <FilmGrain />

      {/* Vignette */}
      <div className="fixed inset-0 pointer-events-none z-40 vignette" />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border py-6">
          <div className="container max-w-4xl mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                <Clapperboard className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground tracking-tight">
                  Reel<span className="text-primary">mates</span>
                </h1>
              </div>
              <p className="font-typewriter text-sm text-muted-foreground tracking-wide">
                Your Letterboxd, dissected & compared
              </p>
            </motion.div>
          </div>
        </header>

        {/* Navigation */}
        <nav className="border-b border-border overflow-x-auto">
          <div className="container max-w-4xl mx-auto px-4 flex justify-center gap-0 min-w-0">
            {[
              { id: 'upload' as Tab, label: 'Upload', icon: Clapperboard },
              { id: 'solo' as Tab, label: 'Solo Stats', icon: BarChart3 },
              { id: 'compare' as Tab, label: 'Compare', icon: GitCompareArrows },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-3 font-typewriter text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Loaded Profiles Bar */}
        {profiles.length > 0 && (
          <div className="border-b border-border bg-secondary/30">
            <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
              <span className="text-xs font-typewriter text-muted-foreground uppercase tracking-widest">Loaded:</span>
              {profiles.map(p => (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border cursor-pointer transition-colors ${
                    selectedId === p.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-foreground hover:border-primary/50'
                  }`}
                  onClick={() => {
                    setSelectedId(p.id);
                    setActiveTab('solo');
                  }}
                >
                  <span className="font-typewriter text-sm">{p.name}</span>
                  <span className="text-xs text-muted-foreground">({p.entries.length})</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeProfile(p.id);
                    }}
                    className="ml-1 text-muted-foreground hover:text-accent"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="container max-w-4xl mx-auto px-4 py-10">
          <AnimatePresence mode="wait">
            {activeTab === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="text-center mb-10">
                  <h2 className="text-2xl font-display text-foreground mb-2">Add a Viewer</h2>
                  <p className="text-sm font-typewriter text-muted-foreground max-w-md mx-auto">
                    Export your data from Letterboxd (Settings → Import & Export → Export Your Data) and upload the ratings.csv or full zip.
                  </p>
                </div>
                <div className="space-y-8">
                  <FileUpload onProfileAdd={handleProfileAdd} />
                </div>
              </motion.div>
            )}

            {activeTab === 'solo' && (
              <motion.div
                key="solo"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {profiles.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="font-typewriter text-muted-foreground">No profiles loaded yet. Upload a CSV first.</p>
                  </div>
                ) : !selected ? (
                  <div className="text-center py-16">
                    <p className="font-typewriter text-muted-foreground mb-4">Select a profile to view stats</p>
                    <div className="flex justify-center gap-3 flex-wrap">
                      {profiles.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedId(p.id)}
                          className="px-4 py-2 border border-border rounded-sm font-typewriter text-sm text-foreground hover:border-primary hover:text-primary transition-colors"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <SoloStats profile={selected} />
                )}
              </motion.div>
            )}

            {activeTab === 'compare' && (
              <motion.div
                key="compare"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <CompareView profiles={profiles} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="border-t border-border py-6 mt-16">
          <div className="container max-w-4xl mx-auto px-4 text-center">
            <div className="flex justify-center gap-6 mb-4">
              <a
                href="https://github.com/Sherlemious/letterboxd-stats"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="GitHub Repository"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://www.sherlemious.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Portfolio"
              >
                <Globe className="w-5 h-5" />
              </a>
            </div>
            <p className="font-typewriter text-xs text-muted-foreground">
              Reelmates — a vintage film zine for the data-obsessed cinephile
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
