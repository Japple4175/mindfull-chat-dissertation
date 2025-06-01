
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
  const q = query(
    collection(db, 'moodEntries'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'), // Re-enabled server-side sorting
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
  // Removed client-side sort as server-side sort is active
  return entries;
}

export function MoodHistory() {
  const currentUser = auth.currentUser; 
  const { data: moodHistory, isLoading, error, refetch } = useQuery<MoodEntry[], Error>({
    queryKey: ['moodHistory', currentUser?.uid],
    queryFn: () => {
      if (!currentUser?.uid) throw new Error('User not authenticated');
      return fetchMoodHistory(currentUser.uid);
    },
    enabled: !!currentUser?.uid, 
  });


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
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Mood History</AlertTitle>
        <AlertDescription>
          {error.message}
          {error.message.includes("query requires an index") && (
             <>
              <br />
              <strong>Action Required:</strong> It seems the Firestore index might still be building or wasn't created. Please ensure the composite index is active in your Firebase console (Firestore -> Indexes). You can usually find a link to create it in the full error message in your server logs or browser console.
             </>
          )}
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
        <CardDescription>Your latest mood entries.</CardDescription> 
      </CardHeader>
      <CardContent className="space-y-4">
        {moodHistory.map(entry => (
          <MoodLogItem key={entry.id} entry={entry} />
        ))}
      </CardContent>
    </Card>
  );
}
