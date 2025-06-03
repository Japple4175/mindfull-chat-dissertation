
'use server';

/**
 * @fileOverview A chatbot conversation AI agent that can use tools to analyze mood trends.
 * Conversation history is managed per session by the client.
 *
 * - getChatbotResponse - Handles the chatbot conversation process.
 * - ChatbotResponseInput - The input type for the getChatbotResponse function.
 * - ChatbotResponseOutput - The return type for the getChatbotResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { ConversationMessage } from '@/lib/types';
import { MoodAnalysisInputSchema, MoodAnalysisOutputSchema } from '@/lib/types';
import { analyzeMoodTrends } from '@/services/mood-service';


const ChatbotResponseInputSchema = z.object({
  message: z.string().describe('The current user message to respond to.'),
  userId: z.string().optional().describe('The ID of the user, if known and logged in.'),
  userName: z.string().optional().describe('The name of the user, if known.'),
  sessionHistory: z.array(z.object({ // History *before* the current user message
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().describe('The conversation history from the current session, excluding the current message.')
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
    if (!userId) {
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
  // The input to this prompt includes the fully formed conversationHistory
  input: { schema: ChatbotResponseInputSchema.extend({
    conversationHistory: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })).describe('The full conversation history for this session. The last message is the current user message to respond to.')
  }) },
  output: { schema: ChatbotResponseOutputSchema },
  tools: [moodAnalyzerTool],
  prompt: `You are Mindful Chat, a supportive mental health AI assistant. Be kind, empathetic, and understanding.
Your responses should be helpful and considerate.

{{#if userId}}
You are speaking with user ID {{userId}}{{#if userName}}, their name is {{userName}}{{/if}}.
Use the conversation history below (where the last message is their current one) to understand the context and respond appropriately.

If they ask about their mood trends or how they've been feeling, and you have their 'userId', you can use the 'getUserMoodAnalysis' tool.
When calling 'getUserMoodAnalysis', you MUST provide their 'userId' (which is '{{userId}}') and a 'timeRange' ('last7days' or 'last30days').
When you get the analysis, discuss it with them. If the analysis result has 'isEmpty: true', it means no (or not enough) mood data was found; inform them gently.
Do not use the tool if you are not confident the user is asking about their mood data or trends.
{{else}}
The user is not logged in, or their ID is not available. You cannot access their mood trends. Respond generally to their message.
{{/if}}

Conversation history (the last message is the current one from the user):
{{#each conversationHistory}}
{{role}}: {{content}}
{{/each}}

Respond to the user's last message in the history.

IMPORTANT: Your final output MUST be a JSON object with a single key "response", and its value should be your textual reply. For example:
{
  "response": "This is my helpful and considerate reply."
}
`,
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

    const fullHistoryForPrompt: ConversationMessage[] = [
      ...(flowInput.sessionHistory || []),
      { role: 'user', content: flowInput.message } // Add current user message to the end
    ];

    try {
      const genkitResponse = await chatbotPrompt({
        message: flowInput.message, // current user message
        userId: flowInput.userId,
        userName: flowInput.userName,
        conversationHistory: fullHistoryForPrompt, // Pass the constructed history
      });
      
      if (!genkitResponse || !genkitResponse.output) {
        throw new Error('AI model call did not return a response object or output.');
      }
      if (!genkitResponse.output.response || typeof genkitResponse.output.response !== 'string') {
        throw new Error('AI model output is valid, but the response text is missing or not a string.');
      }
      
      return genkitResponse.output;

    } catch (e: any) {
      console.error('[Chatbot Response Flow] Error caught:', e);
      const errorMessage = e.message || 'Failed to get chatbot response due to an unexpected error.';
      throw new Error(errorMessage);
    }
  }
);

