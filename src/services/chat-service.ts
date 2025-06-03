
'use server';

/**
 * @fileOverview Service for managing chat message history in Firestore.
 *
 * - fetchChatHistory: Retrieves chat messages for a user.
 * - addChatMessage: Adds a new chat message to a user's history.
 * - deleteAllUserChatHistory: Deletes all chat messages for a user.
 */

import { db } from '@/lib/firebase';
import type { ConversationMessage, ChatMessageEntry, ChatMessageInFirestore } from '@/lib/types';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  addDoc,
  serverTimestamp,
  writeBatch,
  collectionGroup,
} from 'firebase/firestore';

const CHAT_HISTORY_COLLECTION = 'chatHistories';
const MESSAGES_SUBCOLLECTION = 'messages';

/**
 * Fetches the last N chat messages for a given user.
 * Timestamps are converted to ISO strings for client-side compatibility.
 * @param userId The ID of the user.
 * @param count The maximum number of messages to retrieve.
 * @returns A promise that resolves to an array of ChatMessageEntry.
 */
export async function fetchChatHistory(userId: string, count: number = 20): Promise<ChatMessageEntry[]> {
  console.log(`[ChatService] Fetching last ${count} messages for userId: ${userId}`);
  if (!userId) {
    console.warn('[ChatService] fetchChatHistory called without userId.');
    return [];
  }

  try {
    const messagesRef = collection(db, CHAT_HISTORY_COLLECTION, userId, MESSAGES_SUBCOLLECTION);
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(count));
    const querySnapshot = await getDocs(q);

    const messages = querySnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          role: data.role,
          content: data.content,
          timestamp: (data.timestamp as Timestamp).toDate().toISOString(), // Convert to ISO string
        } as ChatMessageEntry;
      })
      .reverse(); // Reverse to maintain chronological order (oldest first)

    console.log(`[ChatService] Fetched ${messages.length} messages for userId: ${userId}`);
    return messages;
  } catch (error) {
    console.error(`[ChatService] Error fetching chat history for userId ${userId}:`, error);
    return [];
  }
}

/**
 * Adds a new chat message to the user's history in Firestore.
 * @param userId The ID of the user.
 * @param message The message object (role and content).
 * @returns A promise that resolves when the message is added.
 */
export async function addChatMessage(userId: string, message: ConversationMessage): Promise<{success: boolean, id?: string, error?: string}> {
  console.log(`[ChatService] Adding message for userId: ${userId}, role: ${message.role}`);
  if (!userId) {
    console.error('[ChatService] addChatMessage error: User ID is required.');
    return { success: false, error: 'User ID is required.' };
  }
  if (!message || !message.role || typeof message.content !== 'string') {
    console.error('[ChatService] addChatMessage error: Invalid message format.');
    return { success: false, error: 'Invalid message format.' };
  }

  try {
    const messageData: ChatMessageInFirestore = {
      role: message.role,
      content: message.content,
      timestamp: serverTimestamp(),
    };
    const messagesRef = collection(db, CHAT_HISTORY_COLLECTION, userId, MESSAGES_SUBCOLLECTION);
    const docRef = await addDoc(messagesRef, messageData);
    console.log(`[ChatService] Message added with ID: ${docRef.id} for userId: ${userId}`);
    return { success: true, id: docRef.id };
  } catch (error: any) {
    console.error(`[ChatService] Error adding chat message for userId ${userId}:`, error);
    return { success: false, error: error.message || 'Failed to save message.' };
  }
}

/**
 * Deletes all chat messages for a specific user.
 * @param userId The ID of the user whose chat history will be deleted.
 * @returns A promise that resolves to an object indicating success or failure.
 */
export async function deleteAllUserChatHistory(userId: string): Promise<{ success: boolean; message?: string; error?: string }> {
  console.log(`[ChatService] Attempting to delete all chat history for userId: ${userId}`);
  if (!userId) {
    console.error('[ChatService] deleteAllUserChatHistory error: User ID is required.');
    return { success: false, error: 'User ID is required.' };
  }

  try {
    const messagesRef = collection(db, CHAT_HISTORY_COLLECTION, userId, MESSAGES_SUBCOLLECTION);
    const q = query(messagesRef);
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`[ChatService] No chat history found to delete for userId: ${userId}`);
      return { success: true, message: 'No chat history found to delete.' };
    }

    const batch = writeBatch(db);
    querySnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`[ChatService] Successfully deleted ${querySnapshot.size} chat messages for userId: ${userId}`);
    return { success: true, message: 'All chat history deleted successfully.' };
  } catch (error: any) {
    console.error(`[ChatService] Error deleting chat history for userId ${userId}:`, error);
    return { success: false, error: error.message || 'Failed to delete chat history.' };
  }
}
