import {genkit, Plugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Initialize Genkit with the Google AI plugin
export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta', // Required for Gemini 1.5 Pro
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
