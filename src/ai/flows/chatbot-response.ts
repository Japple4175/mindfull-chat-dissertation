
'use server';

/**
 * @fileOverview A chatbot conversation AI agent that remembers conversations
 * and can use tools to analyze mood trends.
 *
 * - getChatbotResponse - Handles the chatbot conversation process, including fetching and saving history.
 * - ChatbotResponseInput - The input type for the getChatbotResponse function.
 * - ChatbotResponseOutput - The return type for the getChatbotResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { ConversationMessage } from '@/lib/types';
import { MoodAnalysisInputSchema, MoodAnalysisOutputSchema } from '@/lib/types'; // Assuming these are still relevant for tool use
import { analyzeMoodTrends } from '@/services/mood-service';
import { fetchChatHistory, addChatMessage } from '@/services/chat-service';

const ChatbotResponseInputSchema = z.object({
  message: z.string().describe('The user message to respond to.'),
  userId: z.string().optional().describe('The ID of the user, if known and logged in.'),
  userName: z.string().optional().describe('The name of the user, if known.'),
});
export type ChatbotResponseInput = z.infer<typeof ChatbotResponseInputSchema>;

const ChatbotResponseOutputSchema = z.object({
  response: z.string().describe('The response from the chatbot.'),
});
export type ChatbotResponseOutput = z.infer<typeof ChatbotResponseOutputSchema>;

// Tool for mood analysis
const MoodAnalyzerToolInputSchema = MoodAnalysisInputSchema.extend({
  userId: z.string().describe("The ID of the user whose moods are being analyzed. This MUST be provided by the LLM if the user is logged in."),
});

const moodAnalyzerTool = ai.defineTool(
  {
    name: 'getUserMoodAnalysis',
    description: "Fetches and analyzes a logged-in user's mood trends for a specified period ('last7days' or 'last30days'). Use this to discuss mood patterns, averages, or how the user has been feeling, if they ask about it or if it seems relevant and you have their userId. Do not use if the analysis result indicates no data was found (isEmpty: true) or if no userId is available.",
    inputSchema: MoodAnalyzerToolInputSchema,
    outputSchema: MoodAnalysisOutputSchema,
  },
  async ({ timeRange, userId }) => {
    if (!userId) { // Should not happen if LLM uses tool correctly based on prompt
      return { isEmpty: true, trendSummary: "Cannot analyze moods without user identification. Tool should only be called if userId is known." };
    }
    try {
      console.log(`[MoodAnalyzerTool] Called for userId: ${userId}, timeRange: ${timeRange}`);
      return await analyzeMoodTrends(userId, timeRange);
    } catch (e: any) {
      console.error('[MoodAnalyzerTool] Error calling analyzeMoodTrends:', e);
      return { isEmpty: true, trendSummary: `Error analyzing mood trends: ${e.message}` };
    }
  }
);

// Prompt for ongoing conversation
const chatbotPrompt = ai.definePrompt({
  name: 'chatbotResponsePrompt',
  input: { schema: ChatbotResponseInputSchema.extend({
    // conversationHistory is critical for context
    conversationHistory: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })).optional().describe('The conversation history. The last message is the current user message to respond to.')
  }) },
  output: { schema: ChatbotResponseOutputSchema },
  tools: [moodAnalyzerTool], // Mood tool is always available
  prompt: `You are Mindful Chat, a supportive mental health AI assistant. Be kind, empathetic, and understanding.
Your responses should be helpful and considerate.

{{#if userId}}
You are speaking with user ID {{userId}}{{#if userName}}, their name is {{userName}}{{/if}}.
The user has just received a greeting from you which may have referenced a previous conversation topic.
Their current message is either a response to that greeting or a new topic.
Use the conversation history below (where the last message is their current one) to understand the context and respond appropriately.

If they ask about their mood trends or how they've been feeling, and you have their 'userId', you can use the 'getUserMoodAnalysis' tool.
When calling 'getUserMoodAnalysis', you MUST provide their 'userId' (which is '{{userId}}') and a 'timeRange' ('last7days' or 'last30days').
When you get the analysis, discuss it with them. If the analysis result has 'isEmpty: true', it means no (or not enough) mood data was found; inform them gently.
Do not use the tool if you are not confident the user is asking about their mood data or trends.
{{else}}
The user is not logged in, or their ID is not available. You cannot access their mood trends. Respond generally to their message.
{{/if}}

{{#if conversationHistory.length}}
Conversation history (the last message is the current one from the user):
{{#each conversationHistory}}
{{role}}: {{content}}
{{/each}}
{{else}}
  {{! This case implies the 'message' field from ChatbotResponseInputSchema is the first message,
      but the flow logic ensures conversationHistory sent to prompt always contains the current user message. }}
This is the user's first message in this interaction: {{{message}}}
{{/if}}

Respond to the user's last message in the history.`,
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
    ],
  },
});


export async function getChatbotResponse(input: ChatbotResponseInput): Promise<ChatbotResponseOutput> {
  return chatbotResponseFlow(input);
}

const chatbotResponseFlow = ai.defineFlow(
  {
    name: 'chatbotResponseFlow',
    inputSchema: ChatbotResponseInputSchema,
    outputSchema: ChatbotResponseOutputSchema,
  },
  async (flowInput): Promise<ChatbotResponseOutput> => {
    console.log('[Chatbot Response Flow] Invoked with input:', JSON.stringify(flowInput, null, 2));

    const userMessageToSave: ConversationMessage = { role: 'user', content: flowInput.message };
    let conversationHistoryForAI: ConversationMessage[] = [];

    if (flowInput.userId) {
      // Save user's new message
      await addChatMessage(flowInput.userId, userMessageToSave);
      // Fetch past history (e.g., last 20 messages including the one just added)
      const fetchedHistory = await fetchChatHistory(flowInput.userId, 20);
      conversationHistoryForAI = fetchedHistory.map(msg => ({ role: msg.role, content: msg.content }));
    } else {
      // For non-logged-in users, history is just the current message for the prompt
      conversationHistoryForAI = [userMessageToSave];
    }

    // Ensure the current user message is the last in the history array for the prompt
    // If conversationHistoryForAI was populated from DB, it already includes the latest user message.
    // If user is not logged in, conversationHistoryForAI is just their current message.

    try {
      const genkitResponse = await chatbotPrompt({
        ...flowInput, // includes original message, userId, userName
        conversationHistory: conversationHistoryForAI, // Pass the fetched/constructed history
      });
      
      if (!genkitResponse || !genkitResponse.output) {
        throw new Error('AI model call did not return a response object or output.');
      }
      if (!genkitResponse.output.response || typeof genkitResponse.output.response !== 'string') {
        throw new Error('AI model output is valid, but the response text is missing or not a string.');
      }

      const assistantResponse: ConversationMessage = { role: 'assistant', content: genkitResponse.output.response };
      if (flowInput.userId) {
        // Save AI's response
        await addChatMessage(flowInput.userId, assistantResponse);
      }
      
      return genkitResponse.output;

    } catch (e: any) {
      console.error('[Chatbot Response Flow] Error caught:', e);
      const errorMessage = e.message || 'Failed to get chatbot response due to an unexpected error.';
      // It's better to throw the error so client-side can catch it and display.
      // Or return a specific error structure if preferred.
      throw new Error(errorMessage);
    }
  }
);
