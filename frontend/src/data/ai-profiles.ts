// Shared profile type used across both frontend and backend (duplicated from server for frontend use)

export interface CustomPromptTab {
  id: string;
  icon: string;          // emoji string
  title: string;
  prompts: string[];
}

export interface AIProfile {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  category: string;
  systemPrompt?: string;    // Optional on frontend
  customPrompts?: CustomPromptTab[]; // Auto-generated for custom personas
  ownerId?: string;
  isPublished?: boolean;
  likes?: number;           // Total like count
  likedBy?: string[];       // Array of userIds who liked this
}

export const CATEGORIES = ['Professional', 'Fun', 'Knowledge', 'Spiritual', 'Entertainment', 'Sports'] as const;
export type ProfileCategory = typeof CATEGORIES[number];

export const BUILT_IN_PROFILES: AIProfile[] = [
  { id: 'writing_coach', name: 'Writing Coach', emoji: '✍️', tagline: 'Professional writing partner', category: 'Professional' },
  { id: 'comedian', name: 'The Comedian', emoji: '🎭', tagline: 'Memes, roasts & relentless humor', category: 'Fun' },
  { id: 'spiritual_guide', name: 'Spiritual Guide', emoji: '🙏', tagline: 'Inner peace & mindful wisdom', category: 'Spiritual' },
  { id: 'historian', name: 'The Historian', emoji: '🏛️', tagline: 'All of history, vividly retold', category: 'Knowledge' },
  { id: 'scientist', name: 'The Scientist', emoji: '🧪', tagline: 'Evidence-based thinking & discovery', category: 'Knowledge' },
  { id: 'time_traveler', name: 'Time Traveler', emoji: '⚡', tagline: 'From the future, visiting your past', category: 'Fun' },
  { id: 'movie_critic', name: 'Movie Critic', emoji: '🎬', tagline: 'Cinephile & pop culture expert', category: 'Entertainment' },
  { id: 'cricket_fanatic', name: 'Cricket Fanatic', emoji: '🏏', tagline: "The gentleman's game, passionately", category: 'Sports' },
  { id: 'football_fanatic', name: 'Football Fanatic', emoji: '⚽', tagline: 'The beautiful game, always', category: 'Sports' },
  { id: 'lord_krishna', name: 'Lord Krishna', emoji: '🦚', tagline: 'Wisdom from the Bhagavad Gita', category: 'Spiritual' },
  { id: 'lord_ram', name: 'Lord Ram', emoji: '🏹', tagline: 'Virtue, duty & righteous living', category: 'Spiritual' },
  { id: 'life_coach', name: 'Life Coach Pro', emoji: '🎯', tagline: 'Unlock your best self', category: 'Professional' },
  { id: 'dev_mentor', name: 'Dev Mentor', emoji: '💻', tagline: 'Senior engineer, patient teacher', category: 'Professional' },
  { id: 'debate_champion', name: 'Debate Champion', emoji: '🗣️', tagline: 'Steel-man every argument', category: 'Knowledge' },
];

export const CATEGORY_COLORS: Record<string, string> = {
  Professional: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Fun: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  Knowledge: 'bg-green-500/15 text-green-400 border-green-500/30',
  Spiritual: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  Entertainment: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  Sports: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
};
