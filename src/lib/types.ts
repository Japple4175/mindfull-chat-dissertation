
import type { Timestamp, FieldValue } from 'firebase/firestore';

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
  score: number; // Numerical score for averaging
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

// For storing chat messages in Firestore
export interface ChatMessageInFirestore {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Timestamp | FieldValue; // Allow FieldValue for serverTimestamp
}

// For representing chat messages retrieved from Firestore (timestamp resolved)
export interface ChatMessageEntry extends ConversationMessage {
  id: string;
  timestamp: Timestamp;
}
