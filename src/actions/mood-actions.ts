
'use server';

import { db } from '@/lib/firebase';
import type { MoodEntry, MoodScale } from '@/lib/types';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

// Helper function to check if two Date objects represent the same day in UTC
const isSameUtcDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
};

export async function logMoodAction(userId: string, formData: FormData) {
  console.log('[Server Action] logMoodAction: Invoked with userId:', userId);
  const mood = formData.get('mood') as MoodScale;
  const notes = formData.get('notes') as string | undefined;
  const selectedDateStr = formData.get('date') as string; // Expected format 'yyyy-MM-dd'

  if (!userId) {
    console.error('[Server Action] logMoodAction: Error - User ID is required.');
    return { success: false, error: 'User ID is required.' };
  }
  if (!mood) {
    console.error('[Server Action] logMoodAction: Error - Mood is required.');
    return { success: false, error: 'Mood is required.' };
  }
  if (!selectedDateStr) {
    console.error('[Server Action] logMoodAction: Error - Date is required.');
    return { success: false, error: 'Date is required.' };
  }

  let targetDayUtcMidnight;
  try {
    const parts = selectedDateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // JS Date months are 0-indexed
      const day = parseInt(parts[2], 10);
      targetDayUtcMidnight = new Date(Date.UTC(year, month, day));
    } else {
      throw new Error('Invalid date string format');
    }

    if (isNaN(targetDayUtcMidnight.getTime())) {
        console.error('[Server Action] logMoodAction: Error - Invalid date string provided or parsed:', selectedDateStr);
        return { success: false, error: 'Invalid date format.' };
    }
  } catch (e: any) {
    console.error('[Server Action] logMoodAction: Error parsing date string:', selectedDateStr, e.message);
    return { success: false, error: `Error parsing date: ${e.message}` };
  }
  
  const now = new Date(); // Current server time
  let timestampToSave;

  // Check if the target day (from date picker, represented as UTC midnight) is the same as the current server day (also UTC)
  if (isSameUtcDay(targetDayUtcMidnight, now)) {
    timestampToSave = serverTimestamp(); // Use exact server time for "today's" log
    console.log('[Server Action] logMoodAction: Logging for "today", using serverTimestamp.');
  } else {
    timestampToSave = Timestamp.fromDate(targetDayUtcMidnight); // Use UTC midnight for past/future days
    console.log('[Server Action] logMoodAction: Logging for a past/future day, using UTC midnight of target day (', targetDayUtcMidnight.toISOString(), ').');
  }
  
  const moodDataToSave = {
    userId: userId,
    mood,
    notes: notes || '',
    timestamp: timestampToSave,
    createdAt: serverTimestamp(),
  };

  console.log('[Server Action] logMoodAction: Attempting to save data (timestamp will be server-generated if for today):', JSON.stringify(
    { ...moodDataToSave, timestamp: timestampToSave === serverTimestamp() ? "serverTimestamp()" : targetDayUtcMidnight.toISOString() },
    null, 2)
  );

  try {
    console.log('[Server Action] logMoodAction: Before addDoc call to moodEntries collection.');
    const docRef = await addDoc(collection(db, 'moodEntries'), moodDataToSave);
    console.log('[Server Action] logMoodAction: After addDoc call. Document written with ID:', docRef.id);
    
    revalidatePath('/dashboard');
    revalidatePath('/trends');
    console.log('[Server Action] logMoodAction: Paths revalidated.');
    
    return { success: true, message: 'Mood logged successfully!' };
  } catch (error: any) {
    console.error('[Server Action] logMoodAction: Firestore operation FAILED. Raw error:', error);
    let detailedErrorMessage = 'Failed to save mood to database.';
    if (error.code) { 
      detailedErrorMessage += ` (Error Code: ${error.code})`;
    }
    if (error.message) {
      detailedErrorMessage += `: ${error.message}`;
    }
    console.error(`[Server Action] logMoodAction: Specific error message constructed: ${detailedErrorMessage}`);
    
    return { success: false, error: detailedErrorMessage };
  }
}

export async function deleteMoodAction(moodEntryId: string) {
  console.log('[Server Action] deleteMoodAction: Invoked with moodEntryId:', moodEntryId);
  if (!moodEntryId) {
    console.error('[Server Action] deleteMoodAction: Error - Mood entry ID is required.');
    return { success: false, error: 'Mood entry ID is required.' };
  }

  try {
    console.log('[Server Action] deleteMoodAction: Before deleteDoc call for ID:', moodEntryId);
    await deleteDoc(doc(db, 'moodEntries', moodEntryId));
    console.log('[Server Action] deleteMoodAction: After deleteDoc call. Document deleted.');
    
    revalidatePath('/dashboard');
    revalidatePath('/trends');
    console.log('[Server Action] deleteMoodAction: Paths revalidated.');
    return { success: true, message: 'Mood entry deleted.' };
  } catch (error: any) {
    console.error('[Server Action] deleteMoodAction: Firestore delete operation FAILED. Raw error:', error);
    let errorMessage = 'Failed to delete mood entry.';
     if (error.message) {
        errorMessage = `Failed to delete mood entry: ${error.message}`;
    }
    return { success: false, error: errorMessage };
  }
}

export async function deleteAllUserMoodsAction(userId: string) {
  console.log('[Server Action] deleteAllUserMoodsAction: Invoked for userId:', userId);
  if (!userId) {
    console.error('[Server Action] deleteAllUserMoodsAction: Error - User ID is required.');
    return { success: false, error: 'User ID is required.' };
  }

  try {
    console.log('[Server Action] deleteAllUserMoodsAction: Querying mood entries for user:', userId);
    const q = query(collection(db, 'moodEntries'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('[Server Action] deleteAllUserMoodsAction: No mood entries found for user to delete.');
      revalidatePath('/dashboard');
      revalidatePath('/trends');
      revalidatePath('/settings');
      return { success: true, message: 'No mood data found to delete.' };
    }

    console.log(`[Server Action] deleteAllUserMoodsAction: Found ${querySnapshot.size} entries to delete. Starting batch delete.`);
    const deletePromises: Promise<void>[] = [];
    for (const document of querySnapshot.docs) {
      deletePromises.push(deleteDoc(doc(db, 'moodEntries', document.id)));
    }
    await Promise.all(deletePromises);
    console.log('[Server Action] deleteAllUserMoodsAction: Batch delete completed.');

    revalidatePath('/dashboard');
    revalidatePath('/trends');
    revalidatePath('/settings');
    console.log('[Server Action] deleteAllUserMoodsAction: Paths revalidated.');
    return { success: true, message: 'All mood data deleted successfully.' };
  } catch (error: any) {
    console.error('[Server Action] deleteAllUserMoodsAction: Firestore delete all operation FAILED. Raw error:', error);
    let errorMessage = 'Failed to delete all mood data.';
    if (error.message) {
        errorMessage = `Failed to delete all mood data: ${error.message}`;
    }
    return { success: false, error: errorMessage };
  }
}
