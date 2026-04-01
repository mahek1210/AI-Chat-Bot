import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BUILT_IN_PROFILES, AIProfile } from '../data/ai-profiles';
import { apiGet, apiPost, apiDelete } from '../lib/api';

const CUSTOM_PROFILES_KEY = 'ai_custom_profiles_v2';
const ACTIVE_PROFILE_KEY = 'ai_active_profile';

interface ProfileContextType {
  activeProfile: AIProfile;
  previousProfile: AIProfile | null;
  setActiveProfile: (profile: AIProfile) => void;
  customProfiles: AIProfile[];
  addCustomProfile: (profile: AIProfile) => void;
  deleteCustomProfile: (id: string, skipActiveReset?: boolean) => void;
  allProfiles: AIProfile[];
  categoryChanged: boolean; // true for one render cycle when category switches
  publishProfile: (profile: AIProfile) => Promise<void>;
  deletePublishedProfile: (id: string) => Promise<void>;
  likeProfile: (profileId: string) => Promise<void>;
  isPersonaDeleted: (profileId: string) => boolean;
  isLoadingProfiles: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [fetchedProfiles, setFetchedProfiles] = useState<AIProfile[]>(BUILT_IN_PROFILES);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [customProfiles, setCustomProfiles] = useState<AIProfile[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_PROFILES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeProfile, setActiveProfileState] = useState<AIProfile>(() => {
    try {
      const savedId = localStorage.getItem(ACTIVE_PROFILE_KEY);
      if (savedId) {
        const all = [...fetchedProfiles];
        const found = all.find(p => p.id === savedId);
        if (found) return found;
      }
    } catch {}
    return fetchedProfiles[0] || BUILT_IN_PROFILES[0];
  });

  const [previousProfile, setPreviousProfile] = useState<AIProfile | null>(null);
  const [categoryChanged, setCategoryChanged] = useState(false);
  // allProfiles = server-fetched (built-ins + published globals) 
  //              + local unpublished custom profiles (not yet published)
  // We filter out any local custom profile that has already been published
  // (isPublished: true) so published profiles only show once (from fetchedProfiles).
  const unpublishedCustomProfiles = customProfiles.filter(p => !p.isPublished);
  const fetchedIds = new Set(fetchedProfiles.map(p => p.id));
  // Also exclude any custom profile that now exists in fetchedProfiles (just published)
  const uniqueCustomProfiles = unpublishedCustomProfiles.filter(p => !fetchedIds.has(p.id));
  const allProfiles = [...fetchedProfiles, ...uniqueCustomProfiles];

  // 1. Migration for old profiles
  useEffect(() => {
    if (localStorage.getItem('ai_custom_profiles')) {
      // We don't have a toast provider here, so we just log and clean up
      console.warn('Your old custom personas were reset due to an update.');
      // You could dispatch a custom event to show a toast in App.tsx if desired
      localStorage.removeItem('ai_custom_profiles');
    }
  }, []);

  // 2. Fetch global published personas from Supabase DB
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const res = await apiGet('/api/personas/published');
        if (res.ok) {
          const data = await res.json();
          // Merge: built-ins first, then DB-published (deduplicated)
          const builtInIds = new Set(BUILT_IN_PROFILES.map(p => p.id));
          const dbOnly = (data.personas || []).filter((p: AIProfile) => !builtInIds.has(p.id));
          setFetchedProfiles([...BUILT_IN_PROFILES, ...dbOnly]);
        }
      } catch (err) {
        console.error("Failed to load global profiles:", err);
      } finally {
        setIsLoadingProfiles(false);
      }
    };
    fetchProfiles();
  }, []);

  // When custom profiles load, re-resolve the active profile in case it's custom
  useEffect(() => {
    const savedId = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (savedId) {
      const found = allProfiles.find(p => p.id === savedId);
      if (found) setActiveProfileState(found);
    }
  }, [customProfiles]);

  // Reset categoryChanged after one render
  useEffect(() => {
    if (categoryChanged) {
      const t = setTimeout(() => setCategoryChanged(false), 100);
      return () => clearTimeout(t);
    }
  }, [categoryChanged]);

  const setActiveProfile = (profile: AIProfile) => {
    const catChanged = profile.category !== activeProfile.category;
    setPreviousProfile(activeProfile);
    setActiveProfileState(profile);
    localStorage.setItem(ACTIVE_PROFILE_KEY, profile.id);
    if (catChanged) setCategoryChanged(true);
  };

  const addCustomProfile = (profile: AIProfile) => {
    const updated = [...customProfiles, profile];
    setCustomProfiles(updated);
    localStorage.setItem(CUSTOM_PROFILES_KEY, JSON.stringify(updated));
  };

  const deleteCustomProfile = (id: string, skipActiveReset = false) => {
    const updated = customProfiles.filter(p => p.id !== id);
    setCustomProfiles(updated);
    localStorage.setItem(CUSTOM_PROFILES_KEY, JSON.stringify(updated));
    if (!skipActiveReset && activeProfile.id === id) {
      setActiveProfile(fetchedProfiles[0] || BUILT_IN_PROFILES[0]);
    }
  };

  const publishProfile = async (profile: AIProfile) => {
    const res = await apiPost('/api/personas/publish', profile);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to publish profile");
    }

    const publishedData = await res.json();
    const publishedProfile: AIProfile = publishedData.profile;

    // Step 1: Remove from local custom array (it's now global)
    const updatedCustom = customProfiles.filter(p => p.id !== profile.id);
    setCustomProfiles(updatedCustom);
    localStorage.setItem(CUSTOM_PROFILES_KEY, JSON.stringify(updatedCustom));

    // Step 2: Refresh global profiles from DB
    const refreshRes = await apiGet('/api/personas/published');
    if (refreshRes.ok) {
      const data = await refreshRes.json();
      const builtInIds = new Set(BUILT_IN_PROFILES.map(p => p.id));
      const dbOnly = (data.personas || []).filter((p: AIProfile) => !builtInIds.has(p.id));
      const newFetched = [...BUILT_IN_PROFILES, ...dbOnly];
      setFetchedProfiles(newFetched);

      if (activeProfile.id === profile.id) {
        const publishedVersion = newFetched.find(p => p.id === profile.id) || publishedProfile;
        if (publishedVersion) {
          setActiveProfileState(publishedVersion);
          localStorage.setItem(ACTIVE_PROFILE_KEY, publishedVersion.id);
        }
      }
    }
  };

  const deletePublishedProfile = async (id: string) => {
    const res = await apiDelete(`/api/personas/${id}`);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to delete profile");
    }

    // Refresh profiles from DB
    const refreshRes = await apiGet('/api/personas/published');
    if (refreshRes.ok) {
      const data = await refreshRes.json();
      const builtInIds = new Set(BUILT_IN_PROFILES.map(p => p.id));
      const dbOnly = (data.personas || []).filter((p: AIProfile) => !builtInIds.has(p.id));
      const newFetched = [...BUILT_IN_PROFILES, ...dbOnly];
      setFetchedProfiles(newFetched);
      if (activeProfile.id === id) {
        setActiveProfile(newFetched[0] || BUILT_IN_PROFILES[0]);
      }
    }
  };

  const likeProfile = async (profileId: string) => {
    const res = await apiPost(`/api/personas/${profileId}/like`, {});

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to toggle like");
    }

    // Refresh to get updated like counts
    const refreshRes = await apiGet('/api/personas/published');
    if (refreshRes.ok) {
      const data = await refreshRes.json();
      const builtInIds = new Set(BUILT_IN_PROFILES.map(p => p.id));
      const dbOnly = (data.personas || []).filter((p: AIProfile) => !builtInIds.has(p.id));
      setFetchedProfiles([...BUILT_IN_PROFILES, ...dbOnly]);
    }
  };

  // Check if a persona has been deleted (not in allProfiles anymore)
  // Used to lock sessions where the persona was removed
  const isPersonaDeleted = (profileId: string): boolean => {
    if (!profileId) return false;
    // Built-in profiles are never deleted
    if (BUILT_IN_PROFILES.some(p => p.id === profileId)) return false;
    return !allProfiles.some(p => p.id === profileId);
  };

  return (
    <ProfileContext.Provider value={{
      activeProfile,
      previousProfile,
      setActiveProfile,
      customProfiles,
      addCustomProfile,
      deleteCustomProfile,
      allProfiles,
      categoryChanged,
      publishProfile,
      deletePublishedProfile,
      likeProfile,
      isPersonaDeleted,
      isLoadingProfiles,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within a ProfileProvider');
  return context;
}
