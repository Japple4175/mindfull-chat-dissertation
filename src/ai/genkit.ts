import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Explicitly check if the GOOGLE_API_KEY is set.
// This key is required by the googleAI() plugin to function.
// It should be set in your .env file at the root of your project.
if (!process.env.GOOGLE_API_KEY) {
  throw new Error(
    'CRITICAL: GOOGLE_API_KEY environment variable is not set. ' +
    'Please define it in your .env file with your Google AI Studio API key. ' +
    'The application cannot connect to Google AI services without it.'
  );
}

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});
