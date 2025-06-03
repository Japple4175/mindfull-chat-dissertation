
'use server';

import { db } from '@/lib/firebase';
import type { ConversationMessage, ChatMessageInFirestore, ChatMessageEntry } from '@/lib/types';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
  doc,
  collectionGroup,
  writeBatch
} from 'firebase/firestore';

const CHAT_HISTORY_COLLECTION = 'chatHistories';
const MESSAGES_SUBCOLLECTION = 'messages';
const HISTORY_LIMIT = 20; // Number of past messages to retrieve

/**
 * Fetches the recent chat history for a given user.
 * @param userId The ID of the user.
 * @returns A promise that resolves to an array of conversation messages.
 */
export async function fetchChatHistory(userId: string): Promise<ConversationMessage[]> {
  console.log(`[ChatService] Fetching chat history for userId: ${userId}`);
  try {
    const messagesRef = collection(db, CHAT_HISTORY_COLLECTION, userId, MESSAGES_SUBCOLLECTION);
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(HISTORY_LIMIT));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`[ChatService] No chat history found for userId: ${userId}`);
      return [];
    }

    const history = querySnapshot.docs
      .map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          role: data.role,
          content: data.content,
        } as ConversationMessage;
      })
      .reverse(); // Reverse to maintain chronological order (oldest first)

    console.log(`[ChatService] Fetched ${history.length} messages for userId: ${userId}`);
    return history;
  } catch (error) {
    console.error(`[ChatService] Error fetching chat history for userId ${userId}:`, error);
    throw new Error('Failed to fetch chat history.');
  }
}

/**
 * Adds a new chat message to the user's history.
 * @param userId The ID of the user.
 * @param message The chat message to add.
 * @returns A promise that resolves when the message is added.
 */
export async function addChatMessage(
  userId: string,
  message: { role: 'user' | 'assistant'; content: string }
): Promise<void> {
  console.log(`[ChatService] Adding chat message for userId: ${userId}, role: ${message.role}`);
  try {
    const messageData: ChatMessageInFirestore = {
      ...message,
      timestamp: serverTimestamp(),
    };
    const messagesRef = collection(db, CHAT_HISTORY_COLLECTION, userId, MESSAGES_SUBCOLLECTION);
    await addDoc(messagesRef, messageData);
    console.log(`[ChatService] Chat message added successfully for userId: ${userId}`);
  } catch (error) {
    console.error(`[ChatService] Error adding chat message for userId ${userId}:`, error);
    throw new Error('Failed to save chat message.');
  }
}

/**
 * Deletes all chat history for a given user.
 * This is useful for data management in settings.
 * @param userId The ID of the user.
 * @returns A promise that resolves when all chat messages are deleted.
 */
export async function deleteAllUserChatHistory(userId: string): Promise<void> {
  console.log(`[ChatService] Deleting all chat history for userId: ${userId}`);
  try {
    const messagesPath = `${CHAT_HISTORY_COLLECTION}/${userId}/${MESSAGES_SUBCOLLECTION}`;
    const messagesRef = collection(db, messagesPath);
    const querySnapshot = await getDocs(messagesRef);

    if (querySnapshot.empty) {
      console.log(`[ChatService] No chat history found to delete for userId: ${userId}`);
      return;
    }

    const batch = writeBatch(db);
    querySnapshot.docs.forEach(docSnapshot => {
      batch.delete(docSnapshot.ref);
    });

    await batch.commit();
    console.log(`[ChatService] Successfully deleted ${querySnapshot.size} chat messages for userId: ${userId}`);
  } catch (error) {
    console.error(`[ChatService] Error deleting chat history for userId ${userId}:`, error);
    throw new Error('Failed to delete chat history.');
  }
}
