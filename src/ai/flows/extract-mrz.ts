'use server';

/**
 * @fileOverview Extracts MRZ data from a document image.
 *
 * - extractMrz - A function that extracts Machine-Readable Zone (MRZ) data from an image.
 * - ExtractMrzInput - The input type for the extractMrz function.
 * - MrzData - The return type for the extractMrz function, which is also defined in `src/types`.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { MrzData as MrzDataType } from '@/types';

const ExtractMrzInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a document containing an MRZ, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractMrzInput = z.infer<typeof ExtractMrzInputSchema>;

const MrzDataSchema = z.object({
  documentType: z.string().describe('The type of the document (e.g., P for Passport).'),
  issuingCountry: z.string().describe('The three-letter code of the issuing country.'),
  surname: z.string().describe("The surname of the holder."),
  givenName: z.string().describe("The given name(s) of the holder."),
  documentNumber: z.string().describe('The passport or document number.'),
  nationality: z.string().describe('The three-letter code of the holder\'s nationality.'),
  dateOfBirth: z.string().describe("The holder's date of birth in YYMMDD format."),
  sex: z.string().describe('The sex of the holder (M, F, or < for non-specified).'),
  expiryDate: z.string().describe('The expiry date of the document in YYMMDD format.'),
  personalNumber: z.string().describe('The personal number or other optional data. Can be an empty string.'),
});

// Re-exporting the Zod schema's inferred type to align with the manually defined type
export type MrzData = z.infer<typeof MrzDataSchema>;

const extractMrzFlow = ai.defineFlow(
  {
    name: 'extractMrzFlow',
    inputSchema: ExtractMrzInputSchema,
    outputSchema: MrzDataSchema,
  },
  async input => {
    const prompt = ai.definePrompt({
      name: 'extractMrzPrompt',
      input: { schema: ExtractMrzInputSchema },
      output: { schema: MrzDataSchema },
      prompt: `You are an expert OCR system specialized in reading Machine-Readable Zones (MRZ) from official travel documents like passports and ID cards.

Analyze the provided image with extreme care and accuracy. The MRZ is the block of text at the bottom of the identity page. Parse the information and return it in a structured JSON format.

CRITICAL INSTRUCTIONS:
1.  Double-check every single character. For example, 'O' can be mistaken for '0', 'I' for '1', 'S' for '5', 'B' for '8'. Be extremely precise.
2.  The 'sex' field must be 'M', 'F', or '<'. No other values are permitted.
3.  Pay close attention to the format of dates (YYMMDD) and country codes (3-letter ISO).

Image with MRZ:
{{media url=photoDataUri}}
`,
    });

    const { output } = await prompt(input);
    if (!output) {
      throw new Error('Failed to extract MRZ data from the document.');
    }
    return output;
  }
);


export async function extractMrz(input: ExtractMrzInput): Promise<MrzDataType> {
  const result = await extractMrzFlow(input);
  // The flow already returns the correct structure, we just need to satisfy TypeScript's type from /types
  return result as MrzDataType;
}
