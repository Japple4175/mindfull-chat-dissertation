
'use server';

import type { Mood, MoodScale } from '@/lib/types';
import { Frown, Meh, Smile, SmilePlus, Laugh } from 'lucide-react';

export const moodConfigurations: Mood[] = [
  { value: 'awful', label: 'Awful', icon: Frown, color: 'bg-red-500 hover:bg-red-600', score: 1 },
  { value: 'bad', label: 'Bad', icon: Meh, color: 'bg-orange-500 hover:bg-orange-600', score: 2 },
  { value: 'neutral', label: 'Neutral', icon: Smile, color: 'bg-yellow-500 hover:bg-yellow-600', score: 3 },
  { value: 'good', label: 'Good', icon: SmilePlus, color: 'bg-lime-500 hover:bg-lime-600', score: 4 },
  { value: 'great', label: 'Great', icon: Laugh, color: 'bg-green-500 hover:bg-green-600', score: 5 },
];

export const moodValueToScoreMap = Object.fromEntries(
  moodConfigurations.map(mood => [mood.value, mood.score])
) as Record<MoodScale, number>;

export const moodScoreToLabelMap = Object.fromEntries(
  moodConfigurations.map(mood => [mood.score, mood.label])
) as Record<number, string>;

export const moodValueToLabelMap = Object.fromEntries(
  moodConfigurations.map(mood => [mood.value, mood.label])
) as Record<MoodScale, string>;
