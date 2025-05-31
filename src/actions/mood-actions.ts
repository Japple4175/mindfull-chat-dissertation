
'use server';

import { db } from '@/lib/firebase'; // auth removed as auth.currentUser is not reliable here
import type { MoodEntry, MoodScale } from '@/lib/types';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

export async function logMoodAction(userId: string, formData: FormData) {
  const mood = formData.get('mood') as MoodScale;
  const notes = formData.get('notes') as string | undefined;
  const selectedDateStr = formData.get('date') as string;

  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  if (!mood) {
    return { success: false, error: 'Mood is required.' };
  }
  if (!selectedDateStr) {
    return { success: false, error: 'Date is required.' };
  }

  const selectedDate = new Date(selectedDateStr);
  selectedDate.setHours(12, 0, 0, 0);

  try {
    await addDoc(collection(db, 'moodEntries'), {
      userId: userId, // Use passed userId
      mood,
      notes: notes || '',
      timestamp: selectedDate,
      createdAt: serverTimestamp(),
    });
    revalidatePath('/dashboard');
    revalidatePath('/trends');
    return { success: true, message: 'Mood logged successfully!' };
  } catch (error: any) {
    console.error('Error logging mood:', error);
    return { success: false, error: error.message || 'Failed to log mood.' };
  }
}

export async function deleteMoodAction(moodEntryId: string) {
  // Removed auth.currentUser check. Firestore rules should handle authorization.
  // If Firestore rules are set up correctly (e.g., allow delete if request.auth.uid == resource.data.userId),
  // this operation will only succeed for the owner.
  if (!moodEntryId) {
    return { success: false, error: 'Mood entry ID is required.' };
  }

  try {
    await deleteDoc(doc(db, 'moodEntries', moodEntryId));
    revalidatePath('/dashboard');
    revalidatePath('/trends');
    return { success: true, message: 'Mood entry deleted.' };
  } catch (error: any) {
    console.error('Error deleting mood entry:', error);
    return { success: false, error: error.message || 'Failed to delete mood entry.' };
  }
}

export async function deleteAllUserMoodsAction(userId: string) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  try {
    const q = query(collection(db, 'moodEntries'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const batch = [];
    for (const document of querySnapshot.docs) {
      batch.push(deleteDoc(doc(db, 'moodEntries', document.id)));
    }
    await Promise.all(batch);

    revalidatePath('/dashboard');
    revalidatePath('/trends');
    revalidatePath('/settings');
    return { success: true, message: 'All mood data deleted successfully.' };
  } catch (error: any) {
    console.error('Error deleting all mood data:', error);
    return { success: false, error: error.message || 'Failed to delete all mood data.' };
  }
}
