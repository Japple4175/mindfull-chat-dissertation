'use server';

import { auth, db } from '@/lib/firebase';
import type { MoodEntry, MoodScale } from '@/lib/types';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

export async function logMoodAction(formData: FormData) {
  const mood = formData.get('mood') as MoodScale;
  const notes = formData.get('notes') as string | undefined;
  const selectedDateStr = formData.get('date') as string; // Expect YYYY-MM-DD format

  if (!auth.currentUser) {
    return { success: false, error: 'User not authenticated.' };
  }
  if (!mood) {
    return { success: false, error: 'Mood is required.' };
  }
  if (!selectedDateStr) {
    return { success: false, error: 'Date is required.' };
  }

  // Parse the date string and set time to noon to avoid timezone issues if only date is important.
  const selectedDate = new Date(selectedDateStr);
  selectedDate.setHours(12, 0, 0, 0);


  try {
    await addDoc(collection(db, 'moodEntries'), {
      userId: auth.currentUser.uid,
      mood,
      notes: notes || '',
      timestamp: selectedDate, // Use the selected date (as Firestore Timestamp via Date obj)
      createdAt: serverTimestamp(), // Firestore server timestamp for record creation
    });
    revalidatePath('/dashboard'); // Revalidate dashboard to show new mood
    revalidatePath('/trends'); // Revalidate trends page
    return { success: true, message: 'Mood logged successfully!' };
  } catch (error: any) {
    console.error('Error logging mood:', error);
    return { success: false, error: error.message || 'Failed to log mood.' };
  }
}

export async function deleteMoodAction(moodEntryId: string) {
  if (!auth.currentUser) {
    return { success: false, error: 'User not authenticated.' };
  }

  try {
    // Optional: Add a check to ensure the user owns this mood entry before deleting
    // This would typically be handled by Firestore security rules, but an explicit check can be added.
    // const moodDoc = await getDoc(doc(db, 'moodEntries', moodEntryId));
    // if (moodDoc.exists() && moodDoc.data().userId !== auth.currentUser.uid) {
    //   return { success: false, error: 'Unauthorized to delete this entry.' };
    // }

    await deleteDoc(doc(db, 'moodEntries', moodEntryId));
    revalidatePath('/dashboard');
    revalidatePath('/trends');
    return { success: true, message: 'Mood entry deleted.' };
  } catch (error: any) {
    console.error('Error deleting mood entry:', error);
    return { success: false, error: error.message || 'Failed to delete mood entry.' };
  }
}

export async function deleteAllUserMoodsAction() {
  if (!auth.currentUser) {
    return { success: false, error: 'User not authenticated.' };
  }

  const userId = auth.currentUser.uid;

  try {
    const q = query(collection(db, 'moodEntries'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const batch = []; // Firestore batch writes are more efficient but have a limit (e.g., 500 operations)
    // For simplicity, deleting one by one here. For larger datasets, batching is recommended.
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
