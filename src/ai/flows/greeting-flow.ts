
'use server';

/**
 * @fileOverview Generates a personalized greeting for the chatbot.
 * If conversation history exists, it attempts to reference the last topic.
 *
 * - generateGreeting - Generates the greeting.
 * - GreetingInput - Input type for the greeting generation.
 * - GreetingOutput - Output type for the greeting generation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { fetchChatHistory } from '@/services/chat-service';
import type { ConversationMessage } from '@/lib/types';

export const GreetingInputSchema = z.object({
  userId: z.string().describe('The ID of the user.'),
  userName: z.string().optional().describe('The name of the user, if known.'),
});
export type GreetingInput = z.infer<typeof GreetingInputSchema>;

export const GreetingOutputSchema = z.object({
  greeting: z.string().describe('The generated greeting message.'),
});
export type GreetingOutput = z.infer<typeof GreetingOutputSchema>;

// This internal type is for the prompt's input, which includes fetched messages
const InternalGreetingPromptInputSchema = GreetingInputSchema.extend({
  lastMessages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().describe('The last few messages from the previous conversation, if any.')
});
type InternalGreetingPromptInput = z.infer<typeof InternalGreetingPromptInputSchema>;


const greetingPrompt = ai.definePrompt({
  name: 'greetingPrompt',
  input: { schema: InternalGreetingPromptInputSchema },
  output: { schema: GreetingOutputSchema },
  prompt: `You are a friendly and empathetic AI assistant for Mindful Chat.
Your ONLY task is to generate a short, welcoming greeting (1-2 sentences).

The user's name is {{#if userName}}{{userName}}{{else}}there{{/if}}.

{{#if lastMessages.length}}
This is the end of your previous conversation with them:
{{#each lastMessages}}
{{role}}: {{content}}
{{/each}}

Based on these previous messages, craft a greeting that briefly acknowledges the main topic and asks if they'd like to continue discussing it or talk about something new.
Address them by name.
Example if previous topic was 'feeling anxious about work': 'Hi {{userName TurkishPronouns=false}}! Welcome back. Last time we were talking about feeling anxious about work. Would you like to pick up on that, or is there something new on your mind today?'
Example if previous topic was general check-in: 'Hi {{userName TurkishPronouns=false}}! Good to see you again. How have things been since we last chatted? Feel free to share what's on your mind.'
Example if previous messages are short or unclear topic: 'Hi {{userName TurkishPronouns=false}}! Welcome back. Is there anything you'd like to talk about today?'
Do NOT engage in a long conversation or ask multiple follow-up questions in the greeting itself. Just the greeting.
{{else}}
This is the user's first time chatting or there's no recent history.
Generate a simple, warm, and inviting greeting.
Example: 'Hello {{#if userName}}{{userName}}{{else}}there{{/if}}! I'm here to listen and support you. How are you feeling today?'
{{/if}}
Output only the greeting.`,
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
    ],
    // Using a potentially faster/cheaper model for simple greeting generation.
    // Ensure this model is available or change to 'gemini-pro' if needed.
    model: 'gemini-2.0-flash', 
  },
});

export async function generateGreeting(input: GreetingInput): Promise<GreetingOutput> {
  return greetingFlow(input);
}

const greetingFlow = ai.defineFlow(
  {
    name: 'greetingFlow',
    inputSchema: GreetingInputSchema,
    outputSchema: GreetingOutputSchema,
  },
  async (flowInput: GreetingInput): Promise<GreetingOutput> => {
    console.log('[Greeting Flow] Invoked with input:', JSON.stringify(flowInput, null, 2));
    let lastMessagesForPrompt: ConversationMessage[] = [];

    if (flowInput.userId) {
      try {
        // Fetch last 2-3 messages to get a sense of the last topic
        const history = await fetchChatHistory(flowInput.userId, 3);
        if (history && history.length > 0) {
          lastMessagesForPrompt = history.map(m => ({role: m.role, content: m.content}));
        }
      } catch (e) {
        console.error('[Greeting Flow] Error fetching chat history:', e);
        // Proceed without history if fetching fails
      }
    }
    
    const promptData: InternalGreetingPromptInput = {
      ...flowInput,
      lastMessages: lastMessagesForPrompt,
    };

    try {
      const genkitResponse = await greetingPrompt(promptData);

      if (!genkitResponse || !genkitResponse.output || !genkitResponse.output.greeting) {
        console.error('[Greeting Flow] AI model did not return a valid greeting.');
        // Fallback greeting
        const userNamePart = flowInput.userName ? `, ${flowInput.userName}` : '';
        return { greeting: `Hello${userNamePart}! I'm here to listen. How can I help you today?` };
      }
      
      console.log('[Greeting Flow] Generated greeting:', genkitResponse.output.greeting);
      return genkitResponse.output;

    } catch (e: any) {
      console.error('[Greeting Flow] Error caught during greeting generation:', e);
      const userNamePart = flowInput.userName ? `, ${flowInput.userName}` : '';
      // Fallback greeting in case of error
      return { greeting: `Hello${userNamePart}! Welcome. Is there anything on your mind?` };
    }
  }
);
