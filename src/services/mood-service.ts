
'use server';

import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MoodEntry, MoodScale, MoodAnalysisOutput } from '@/lib/types';
import { moodValueToScoreMap, moodValueToLabelMap } from '@/lib/mood-definitions';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';

export async function analyzeMoodTrends(
  userId: string,
  timeRange: 'last7days' | 'last30days'
): Promise<MoodAnalysisOutput> {
  console.log(`[MoodService] Analyzing trends for user ${userId}, range: ${timeRange}`);
  const now = new Date();
  let startDate: Date;
  const periodEndDate = endOfDay(now);

  if (timeRange === 'last7days') {
    startDate = startOfDay(subDays(now, 6)); // Last 7 days including today
  } else { // last30days
    startDate = startOfDay(subDays(now, 29)); // Last 30 days including today
  }

  const q = query(
    collection(db, 'moodEntries'),
    where('userId', '==', userId),
    where('timestamp', '>=', startDate),
    where('timestamp', '<=', periodEndDate),
    orderBy('timestamp', 'asc')
  );

  const querySnapshot = await getDocs(q);
  const moodEntries: MoodEntry[] = querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      timestamp: (data.timestamp as Timestamp).toDate(),
    } as MoodEntry;
  });

  if (moodEntries.length === 0) {
    console.log('[MoodService] No mood entries found for the period.');
    return { 
      isEmpty: true, 
      trendSummary: "No mood data logged for this period.",
      periodStartDate: format(startDate, 'yyyy-MM-dd'),
      periodEndDate: format(periodEndDate, 'yyyy-MM-dd'),
    };
  }

  let totalScore = 0;
  const distribution: Record<string, number> = {
    awful: 0,
    bad: 0,
    neutral: 0,
    good: 0,
    great: 0,
  };

  moodEntries.forEach(entry => {
    const score = moodValueToScoreMap[entry.mood];
    if (score !== undefined) {
      totalScore += score;
    }
    distribution[entry.mood]++;
  });

  const averageMoodScore = parseFloat((totalScore / moodEntries.length).toFixed(2));
  
  // Basic trend summary logic
  let summary = `Over the ${timeRange === 'last7days' ? 'last 7 days' : 'last 30 days'} (from ${format(startDate, 'MMM d')} to ${format(periodEndDate, 'MMM d')}), your average mood score was ${averageMoodScore.toFixed(1)} out of 5. `;
  
  const dominantMoods = Object.entries(distribution)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  
  if (dominantMoods.length > 0) {
    summary += `You most frequently logged feeling ${moodValueToLabelMap[dominantMoods[0][0] as MoodScale]} (${dominantMoods[0][1]} times). `;
    if (dominantMoods.length > 1) {
      summary += `Other moods included ${moodValueToLabelMap[dominantMoods[1][0] as MoodScale]} (${dominantMoods[1][1]} times).`;
    }
  } else {
    summary += "No specific mood was dominant."
  }


  console.log('[MoodService] Analysis complete:', { averageMoodScore, distribution, summary });
  return {
    averageMoodScore,
    moodDistribution: distribution,
    trendSummary: summary,
    isEmpty: false,
    periodStartDate: format(startDate, 'yyyy-MM-dd'),
    periodEndDate: format(periodEndDate, 'yyyy-MM-dd'),
  };
}
