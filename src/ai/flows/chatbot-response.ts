
'use server';

/**
 * @fileOverview A chatbot conversation AI agent.
 *
 * - getChatbotResponse - A function that handles the chatbot conversation process.
 * - ChatbotResponseInput - The input type for the getChatbotResponse function.
 * - ChatbotResponseOutput - The return type for the getChatbotResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { ConversationMessage } from '@/lib/types';
import { MoodAnalysisInputSchema, MoodAnalysisOutputSchema } from '@/lib/types';
import { analyzeMoodTrends } from '@/services/mood-service';

const ChatbotResponseInputSchema = z.object({
  message: z.string().describe('The user message to respond to.'),
  userId: z.string().optional().describe('The ID of the user, if known and logged in.'),
  userName: z.string().optional().describe('The name of the user, if known.'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().describe('The conversation history between the user and the bot.')
});
export type ChatbotResponseInput = z.infer<typeof ChatbotResponseInputSchema>;

const ChatbotResponseOutputSchema = z.object({
  response: z.string().describe('The response from the chatbot.'),
});
export type ChatbotResponseOutput = z.infer<typeof ChatbotResponseOutputSchema>;

export async function getChatbotResponse(input: ChatbotResponseInput): Promise<ChatbotResponseOutput> {
  return chatbotResponseFlow(input);
}

// This flow is defined outside and then called, to allow dynamic tool definition
const chatbotResponseFlow = ai.defineFlow(
  {
    name: 'chatbotResponseFlow',
    inputSchema: ChatbotResponseInputSchema,
    outputSchema: ChatbotResponseOutputSchema,
  },
  async (flowInput): Promise<ChatbotResponseOutput> => {
    console.log('[Chatbot Flow] Invoked with input:', JSON.stringify(flowInput, null, 2));
    const { userId, userName, message, conversationHistory } = flowInput;

    let toolsList:any[] = [];
    let systemPromptExtension = "";

    if (userId) {
      const moodAnalyzerTool = ai.defineTool(
        {
          name: 'getUserMoodAnalysis',
          description: "Fetches and analyzes the user's logged mood trends for a specified period ('last7days' or 'last30days'). Use this to discuss mood patterns, averages, or how the user has been feeling, if they ask about it or if it seems relevant. Do not use if the analysis result indicates no data was found (isEmpty: true).",
          inputSchema: MoodAnalysisInputSchema,
          outputSchema: MoodAnalysisOutputSchema,
        },
        async ({ timeRange }) => { // Tool handler
          if (!userId) { // Should not happen if tool is only added when userId exists
            return { isEmpty: true, trendSummary: "Cannot analyze moods without user identification." };
          }
          try {
            return await analyzeMoodTrends(userId, timeRange);
          } catch (e: any) {
            console.error('[Chatbot Flow] Error calling analyzeMoodTrends from tool:', e);
            return { isEmpty: true, trendSummary: `Error analyzing mood trends: ${e.message}` };
          }
        }
      );
      toolsList.push(moodAnalyzerTool);
      systemPromptExtension = `
You are speaking with user ID ${userId}.
{{#if userName}}You know their name is {{userName}}.{{/if}}
This user can log their moods. If they ask about their mood trends or how they've been feeling, you can use the 'getUserMoodAnalysis' tool to get a summary of their mood data for the 'last7days' or 'last30days'.
When you get the analysis, discuss it with them. For example, you can mention their average mood or common moods from the 'moodDistribution' or 'trendSummary'.
If the analysis result has 'isEmpty: true', it means the user hasn't logged (enough) moods for the period; inform them of this and encourage them to log more moods.
Do not use the tool if you are not confident the user is asking about their mood data or trends.
`;
    }


    const prompt = ai.definePrompt({
      name: 'chatbotResponsePrompt',
      input: { schema: ChatbotResponseInputSchema }, // Kept for consistency, but flowInput used directly
      output: { schema: ChatbotResponseOutputSchema },
      tools: toolsList,
      prompt: `You are a mental health chatbot designed to provide supportive responses to users. Be kind and understanding.
${systemPromptExtension}
{{#if userName}}
You are speaking with {{userName}}. Try to use their name naturally in conversation if appropriate, to make the interaction feel more personal.
{{/if}}
{{#if conversationHistory}}
You have access to the previous conversation history with this user. Use it to inform your responses and provide continuity.
Respond to the current user message while taking into account the conversation history.

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

    try {
      // Pass only the relevant parts of flowInput that match the prompt's expected structure
      // or that Handlebars needs. The `tools` mechanism will handle tool calls.
      const genkitResponse = await prompt({ message, userName, conversationHistory, userId });


      if (!genkitResponse || !genkitResponse.output) {
        let detailMessage = 'No output from AI model.';
        if (!genkitResponse) {
          detailMessage = 'AI model call did not return a response object.';
        }
        console.error(`[Chatbot Flow] Error: ${detailMessage} Full Genkit response (if available):`, 
          genkitResponse ? JSON.stringify(genkitResponse, null, 2) : 'N/A'
        );
        if (genkitResponse && genkitResponse.candidates && genkitResponse.candidates.length > 0) {
          genkitResponse.candidates.forEach((candidate, index) => {
            const finishReason = candidate.finishReason;
            const candidateMessageParts = candidate.message?.content; 
            console.error(`[Chatbot Flow] Candidate ${index}: Finish Reason - ${finishReason}`);
            console.error(`[Chatbot Flow] Candidate ${index}: Message Parts - ${JSON.stringify(candidateMessageParts, null, 2)}`);
            if (finishReason === 'TOOL_CALLS' && candidate.message?.toolRequests) {
              console.log(`[Chatbot Flow] Candidate ${index} requested tool calls:`, JSON.stringify(candidate.message.toolRequests, null, 2));
            } else if (finishReason === 'SAFETY' && Array.isArray(candidateMessageParts)) {
              let safetyRatingsFound = null;
              for (const part of candidateMessageParts) {
                if (part.custom?.safetyRatings) {
                  safetyRatingsFound = part.custom.safetyRatings;
                  break;
                }
              }
              if (safetyRatingsFound) {
                console.error(`[Chatbot Flow] Candidate ${index} Safety Ratings:`, JSON.stringify(safetyRatingsFound, null, 2));
              } else {
                 console.warn(`[Chatbot Flow] Candidate ${index} finishReason is SAFETY, but safetyRatings not found in expected structure.`);
              }
            }
          });
          throw new Error('The AI model did not return a valid response, potentially due to safety filters or incomplete tool use. Check server logs.');
        } else if (genkitResponse && (!genkitResponse.candidates || genkitResponse.candidates.length === 0)) {
           console.warn('[Chatbot Flow] Error: AI model response contained no candidates.');
           throw new Error('The AI model response contained no candidates. Check server logs.');
        }
        throw new Error(`[Chatbot Flow] Error: ${detailMessage} Check server logs.`);
      }
      
      if (!genkitResponse.output.response || typeof genkitResponse.output.response !== 'string') {
        console.error('[Chatbot Flow] Error: AI model output is valid, but the response text is missing or not a string. Output:', JSON.stringify(genkitResponse.output, null, 2));
        throw new Error('AI model returned an invalid response format. Expected a text string.');
      }
      
      return genkitResponse.output;

    } catch (e: any) {
      console.error('[Chatbot Flow] Error caught. Raw error object:', e);
      try {
        console.error('[Chatbot Flow] Error (stringified with sensitive data handling):', 
          JSON.stringify(e, (key, value) => {
            if (typeof value === 'string' && (key.toLowerCase().includes('key') || key.toLowerCase().includes('secret'))) {
              return '[REDACTED]';
            }
            return value;
          }, 2)
        );
      } catch (stringifyError) {
        console.error('[Chatbot Flow] Failed to stringify error object:', stringifyError);
      }
      
      let errorMessage = 'Failed to get chatbot response due to an unexpected error in the AI flow. Check server logs.';
      if (e && e.message) {
        errorMessage = `Failed to get chatbot response: ${e.message}. Check server logs.`;
      } else if (typeof e === 'string') {
        errorMessage = `Failed to get chatbot response: ${e}. Check server logs.`;
      }
      
      throw new Error(errorMessage);
    }
  }
);
