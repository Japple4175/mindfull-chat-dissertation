
'use server';

import { db } from '@/lib/firebase';
import type { MoodEntry, MoodScale } from '@/lib/types';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

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

  let selectedDateObject;
  try {
    // The string 'yyyy-MM-dd' is interpreted by new Date() as UTC midnight.
    selectedDateObject = new Date(selectedDateStr);
    if (isNaN(selectedDateObject.getTime())) {
        console.error('[Server Action] logMoodAction: Error - Invalid date string provided:', selectedDateStr);
        return { success: false, error: 'Invalid date format.' };
    }
  } catch (e) {
    console.error('[Server Action] logMoodAction: Error parsing date string:', selectedDateStr, e);
    return { success: false, error: 'Error parsing date.' };
  }
  
  const moodDataToSave = {
    userId: userId,
    mood,
    notes: notes || '',
    timestamp: Timestamp.fromDate(selectedDateObject), // Convert JS Date to Firestore Timestamp
    createdAt: serverTimestamp(),
  };

  console.log('[Server Action] logMoodAction: Attempting to save data:', JSON.stringify(
    { ...moodDataToSave, timestamp: selectedDateObject.toISOString() },
    null, 2)
  );

  try {
    console.log('[Server Action] logMoodAction: Before addDoc call to moodEntries collection.');
    const docRef = await addDoc(collection(db, 'moodEntries'), moodDataToSave);
    console.log('[Server Action] logMoodAction: After addDoc call. Document written with ID:', docRef.id);

    // Temporarily commenting out revalidatePath for diagnosis
    // console.log('[Server Action] logMoodAction: Attempting to revalidate paths.');
    // revalidatePath('/dashboard');
    // revalidatePath('/trends');
    // console.log('[Server Action] logMoodAction: Paths revalidated successfully (commented out).');
    
    return { success: true, message: 'Mood logged successfully!' };
  } catch (error: any) {
    console.error('[Server Action] logMoodAction: Error during Firestore operation or revalidation. Raw error:', error);
    console.error('[Server Action] logMoodAction: Error name:', error.name);
    console.error('[Server Action] logMoodAction: Error message:', error.message);
    if (error.code) {
      console.error('[Server Action] logMoodAction: Error code:', error.code);
    }
    
    let errorMessage = 'Failed to log mood. Please try again.';
    if (error.message) {
        if (String(error.message).toLowerCase().includes('permission denied')) {
            errorMessage = 'Failed to log mood: Permission denied. Please check Firestore rules.';
        } else {
            errorMessage = `Failed to log mood: ${error.message}`;
        }
    } else if (typeof error === 'string') {
        errorMessage = `Failed to log mood: ${error}`;
    }
    
    return { success: false, error: errorMessage };
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
    
    // Temporarily commenting out revalidatePath for diagnosis
    // revalidatePath('/dashboard');
    // revalidatePath('/trends');
    // console.log('[Server Action] deleteMoodAction: Paths revalidated (commented out).');
    return { success: true, message: 'Mood entry deleted.' };
  } catch (error: any) {
    console.error('[Server Action] deleteMoodAction: Error during Firestore delete operation or revalidation. Raw error:', error);
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
      // Temporarily commenting out revalidatePath for diagnosis
      // revalidatePath('/dashboard');
      // revalidatePath('/trends');
      // revalidatePath('/settings');
      return { success: true, message: 'No mood data found to delete.' };
    }

    console.log(`[Server Action] deleteAllUserMoodsAction: Found ${querySnapshot.size} entries to delete. Starting batch delete.`);
    const batch = [];
    for (const document of querySnapshot.docs) {
      batch.push(deleteDoc(doc(db, 'moodEntries', document.id)));
    }
    await Promise.all(batch);
    console.log('[Server Action] deleteAllUserMoodsAction: Batch delete completed.');

    // Temporarily commenting out revalidatePath for diagnosis
    // revalidatePath('/dashboard');
    // revalidatePath('/trends');
    // revalidatePath('/settings');
    // console.log('[Server Action] deleteAllUserMoodsAction: Paths revalidated (commented out).');
    return { success: true, message: 'All mood data deleted successfully.' };
  } catch (error: any) {
    console.error('[Server Action] deleteAllUserMoodsAction: Error deleting all mood data. Raw error:', error);
    let errorMessage = 'Failed to delete all mood data.';
    if (error.message) {
        errorMessage = `Failed to delete all mood data: ${error.message}`;
    }
    return { success: false, error: errorMessage };
  }
}
