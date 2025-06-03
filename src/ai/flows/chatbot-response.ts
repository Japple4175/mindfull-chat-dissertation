
'use server';

/**
 * @fileOverview A chatbot conversation AI agent that remembers conversations.
 *
 * - getChatbotResponse - Handles the chatbot conversation process, including fetching and saving history.
 * - ChatbotResponseInput - The input type for the getChatbotResponse function.
 * - ChatbotResponseOutput - The return type for the getChatbotResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { ConversationMessage, ChatMessageEntry } from '@/lib/types';
import { MoodAnalysisInputSchema, MoodAnalysisOutputSchema } from '@/lib/types';
import { analyzeMoodTrends } from '@/services/mood-service';
import { fetchChatHistory, addChatMessage } from '@/services/chat-service';

const ChatbotResponseInputSchema = z.object({
  message: z.string().describe('The user message to respond to.'),
  userId: z.string().optional().describe('The ID of the user, if known and logged in.'),
  userName: z.string().optional().describe('The name of the user, if known.'),
  // conversationHistory is no longer passed from client, it's fetched by the flow
});
export type ChatbotResponseInput = z.infer<typeof ChatbotResponseInputSchema>;

const ChatbotResponseOutputSchema = z.object({
  response: z.string().describe('The response from the chatbot.'),
});
export type ChatbotResponseOutput = z.infer<typeof ChatbotResponseOutputSchema>;

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
    if (!userId) {
      return { isEmpty: true, trendSummary: "Cannot analyze moods without user identification. Please ask the user to log in or confirm their identity if applicable." };
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

const chatbotPrompt = ai.definePrompt({
  name: 'chatbotResponsePrompt',
  // Input schema for the prompt itself, now includes the fetched conversation history
  input: { schema: ChatbotResponseInputSchema.extend({
    conversationHistory: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })).optional().describe('The conversation history between the user and the bot, fetched from persistent storage.')
  }) },
  output: { schema: ChatbotResponseOutputSchema },
  tools: [moodAnalyzerTool],
  prompt: `You are a mental health chatbot designed to provide supportive responses to users. Be kind and understanding.
You can remember past conversations with logged-in users.

{{#if userId}}
You are speaking with user ID {{userId}}.
{{#if userName}}You know their name is {{userName}}. Try to use their name naturally in conversation if appropriate, to make the interaction feel more personal.{{/if}}
This user can log their moods. If they ask about their mood trends or how they've been feeling, you can use the 'getUserMoodAnalysis' tool.
When calling 'getUserMoodAnalysis', you MUST provide their 'userId' (which is '{{userId}}') and a 'timeRange' ('last7days' or 'last30days').
When you get the analysis, discuss it with them. For example, you can mention their average mood or common moods from the 'moodDistribution' or 'trendSummary'.
If the analysis result has 'isEmpty: true', it means the user hasn't logged (enough) moods for the period; inform them of this and encourage them to log more moods.
Do not use the tool if you are not confident the user is asking about their mood data or trends, or if no 'userId' is available.
{{else}}
The user is not logged in, or their ID is not available. You cannot access their mood trends or remember past conversations. You can still chat generally.
{{/if}}

{{#if conversationHistory.length}}
Conversation history:
{{#each conversationHistory}}
{{role}}: {{content}}
{{/each}}
{{/if}}

Current User message: {{{message}}}`,
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
    console.log('[Chatbot Flow with Memory] Invoked with input:', JSON.stringify(flowInput, null, 2));

    const userMessage: ConversationMessage = { role: 'user', content: flowInput.message };
    let conversationHistoryForAI: ConversationMessage[] = [];

    if (flowInput.userId) {
      // Save user's new message
      await addChatMessage(flowInput.userId, userMessage);
      // Fetch past history (e.g., last 20 messages including the one just added)
      const fetchedHistory = await fetchChatHistory(flowInput.userId, 20);
      conversationHistoryForAI = fetchedHistory.map(msg => ({ role: msg.role, content: msg.content }));
    } else {
      // For non-logged-in users, history is just the current message
      conversationHistoryForAI = [userMessage];
    }

    try {
      const genkitResponse = await chatbotPrompt({
        ...flowInput, // includes message, userId, userName
        conversationHistory: conversationHistoryForAI, // Pass the fetched/constructed history
      });

      if (!genkitResponse || !genkitResponse.output) {
        let detailMessage = 'No output from AI model.';
        if (!genkitResponse) detailMessage = 'AI model call did not return a response object.';
        console.error(`[Chatbot Flow with Memory] Error: ${detailMessage}`);
        throw new Error(`[Chatbot Flow with Memory] Error: ${detailMessage}. Check server logs.`);
      }
      
      if (!genkitResponse.output.response || typeof genkitResponse.output.response !== 'string') {
        console.error('[Chatbot Flow with Memory] Error: AI model output is valid, but the response text is missing or not a string.');
        throw new Error('AI model returned an invalid response format. Expected a text string.');
      }

      const assistantResponse: ConversationMessage = { role: 'assistant', content: genkitResponse.output.response };
      if (flowInput.userId) {
        // Save AI's response
        await addChatMessage(flowInput.userId, assistantResponse);
      }
      
      return genkitResponse.output;

    } catch (e: any) {
      console.error('[Chatbot Flow with Memory] Error caught:', e);
      let errorMessage = 'Failed to get chatbot response due to an unexpected error in the AI flow. Check server logs.';
      if (e && e.message) errorMessage = `Failed to get chatbot response: ${e.message}. Check server logs.`;
      else if (typeof e === 'string') errorMessage = `Failed to get chatbot response: ${e}. Check server logs.`;
      throw new Error(errorMessage);
    }
  }
);
