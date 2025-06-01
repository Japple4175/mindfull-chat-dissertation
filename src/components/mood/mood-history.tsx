
'use client';

import { useQuery } from '@tanstack/react-query';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { MoodEntry } from '@/lib/types';
import { MoodLogItem } from './mood-log-item';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

async function fetchMoodHistory(userId: string): Promise<MoodEntry[]> {
  // IMPORTANT: The orderBy clause was temporarily removed to avoid an error due to a missing Firestore index.
  // For correct "Recent Moods" functionality (fetching the actual most recent entries),
  // please create the composite index in Firebase as indicated by the error message you saw.
  // The link is typically: https://console.firebase.google.com/v1/r/project/YOUR_PROJECT_ID/firestore/indexes?create_composite=...
  const q = query(
    collection(db, 'moodEntries'),
    where('userId', '==', userId),
    // orderBy('timestamp', 'desc'), // Temporarily removed. Create the Firestore index for this.
    limit(10) // Fetch up to 10 entries
  );
  const querySnapshot = await getDocs(q);
  const entries = querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      mood: data.mood,
      notes: data.notes,
      timestamp: data.timestamp as Timestamp,
      createdAt: data.createdAt as Timestamp,
    } as MoodEntry;
  });

  // Client-side sort for the fetched (limited and potentially not the newest) entries.
  // This makes the displayed 10 items appear in order, but they might not be the globally most recent 10.
  return entries.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
}

export function MoodHistory() {
  const currentUser = auth.currentUser; // Direct usage, assumes AuthProvider has updated by now
  const { data: moodHistory, isLoading, error, refetch } = useQuery<MoodEntry[], Error>({
    queryKey: ['moodHistory', currentUser?.uid],
    queryFn: () => {
      if (!currentUser?.uid) throw new Error('User not authenticated');
      return fetchMoodHistory(currentUser.uid);
    },
    enabled: !!currentUser?.uid, // Only run query if userId is available
  });

  // Consider adding a button or interval to refetch if needed, or rely on revalidatePath from server actions

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Recent Moods</CardTitle>
          <CardDescription>Your latest mood entries.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 border rounded-lg">
              <Skeleton className="h-6 w-1/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-3" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    // The error.message from Firebase should contain the link to create the index.
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Mood History</AlertTitle>
        <AlertDescription>
          {error.message}
          <br />
          <strong>Action Required:</strong> Please create the recommended Firestore index using the link above to ensure moods are fetched and sorted correctly.
        </AlertDescription>
      </Alert>
    );
  }

  if (!moodHistory || moodHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Recent Moods</CardTitle>
        </CardHeader>
        <CardContent>
           <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>No Moods Logged Yet</AlertTitle>
            <AlertDescription>
              Start logging your moods to see your history here.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Recent Moods</CardTitle>
        <CardDescription>Your latest mood entries. (Note: Sorting might be temporarily affected if Firestore index is pending)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {moodHistory.map(entry => (
          <MoodLogItem key={entry.id} entry={entry} />
        ))}
      </CardContent>
    </Card>
  );
}
