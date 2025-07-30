// src/ai/flows/enhance-scan-quality.ts
'use server';

/**
 * @fileOverview Enhances the quality of a scanned document image.
 *
 * - enhanceScan - A function that enhances the quality of a scanned document image.
 * - EnhanceScanInput - The input type for the enhanceScan function.
 * - EnhanceScanOutput - The return type for the enhanceScan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EnhanceScanInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type EnhanceScanInput = z.infer<typeof EnhanceScanInputSchema>;

const EnhanceScanOutputSchema = z.object({
  enhancedPhotoDataUri: z
    .string()
    .describe(
      'A data URI containing the enhanced image, with MIME type and Base64 encoding.'
    ),
});
export type EnhanceScanOutput = z.infer<typeof EnhanceScanOutputSchema>;

export async function enhanceScan(input: EnhanceScanInput): Promise<EnhanceScanOutput> {
  return enhanceScanFlow(input);
}

const enhanceScanPrompt = ai.definePrompt({
  name: 'enhanceScanPrompt',
  input: {schema: EnhanceScanInputSchema},
  output: {schema: EnhanceScanOutputSchema},
  prompt: `You are an AI image enhancement service.

You will receive a scanned image of a document. Your goal is to improve the quality of the image such that it is easier to read by an OCR system. You should attempt to:

*   Increase contrast
*   Sharpen the image
*   Correct the rotation of the image
*   Remove noise from the image

Return the enhanced image as a data URI.

Original image: {{media url=photoDataUri}}

Enhanced image: {{enhancedPhotoDataUri}}`,
});

const enhanceScanFlow = ai.defineFlow(
  {
    name: 'enhanceScanFlow',
    inputSchema: EnhanceScanInputSchema,
    outputSchema: EnhanceScanOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        {media: {url: input.photoDataUri}},
        {text: 'Enhance this document scan for OCR.'},
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error('No enhanced image was returned.');
    }

    return {enhancedPhotoDataUri: media.url};
  }
);
