"use client";
import { useState, useCallback } from 'react';
import { UserProfile } from '@/lib/types';

export function useProfiles() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const addProfile = useCallback((profile: UserProfile) => {
    setProfiles(prev => [...prev, profile]);
    setSelectedId(profile.id);
  }, []);

  const removeProfile = useCallback((id: string) => {
    setProfiles(prev => prev.filter(p => p.id !== id));
    setSelectedId(prev => (prev === id ? null : prev));
  }, []);

  const selected = profiles.find(p => p.id === selectedId) ?? null;

  return { profiles, selectedId, selected, addProfile, removeProfile, setSelectedId };
}
