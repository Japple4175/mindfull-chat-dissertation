
import type { Timestamp, FieldValue } from 'firebase/firestore';
import { z } from 'zod';

export type MoodScale = 'awful' | 'bad' | 'neutral' | 'good' | 'great';

export interface MoodEntry {
  id: string;
  userId: string;
  mood: MoodScale;
  notes?: string;
  timestamp: Timestamp; 
  createdAt: Timestamp; 
}

export interface Mood {
  value: MoodScale;
  label: string;
  icon: React.ElementType;
  color: string; 
  score: number; 
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const MoodAnalysisInputSchema = z.object({
  timeRange: z.enum(['last7days', 'last30days']).describe("The time range for mood analysis, either 'last7days' or 'last30days'."),
});
export type MoodAnalysisInput = z.infer<typeof MoodAnalysisInputSchema>;

export const MoodAnalysisOutputSchema = z.object({
  averageMoodScore: z.number().optional().describe("The average mood score for the period (1-5, where 1 is awful and 5 is great)."),
  moodDistribution: z.record(z.string(), z.number()).optional().describe("An object showing the count of each mood (e.g., {'good': 5, 'neutral': 2}). Keys are mood scale values."),
  trendSummary: z.string().optional().describe("A brief textual summary of the mood trends."),
  isEmpty: z.boolean().optional().describe("True if no mood data was found for the period, false otherwise."),
  periodStartDate: z.string().optional().describe("The start date of the analysis period (YYYY-MM-DD)."),
  periodEndDate: z.string().optional().describe("The end date of the analysis period (YYYY-MM-DD)."),
});
export type MoodAnalysisOutput = z.infer<typeof MoodAnalysisOutputSchema>;
