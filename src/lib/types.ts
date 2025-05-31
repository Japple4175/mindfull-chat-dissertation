import type { Timestamp } from 'firebase/firestore';

export type MoodScale = 'awful' | 'bad' | 'neutral' | 'good' | 'great';

export interface MoodEntry {
  id: string;
  userId: string;
  mood: MoodScale;
  notes?: string;
  timestamp: Timestamp; // Firestore Timestamp for the date of the mood
  createdAt: Timestamp; // Firestore Timestamp for when the record was created
}

export interface Mood {
  value: MoodScale;
  label: string;
  icon: React.ElementType;
  color: string; // Tailwind color class
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}
