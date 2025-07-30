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
      "A photo of a document containing an MRZ, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
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
      prompt: `You are a world-class OCR system with specialized expertise in parsing Machine-Readable Zones (MRZ) from official government-issued identity documents. Your accuracy is paramount.

Analyze the provided image. The MRZ is the two or three lines of text at the bottom of the identity page. Extract the information with extreme precision and return it as a structured JSON object.

CRITICAL ACCURACY INSTRUCTIONS:
1.  **Character Precision:** Be extremely vigilant about common OCR errors.
    *   'O' (letter) vs. '0' (digit)
    *   'I' (letter) vs. '1' (digit)
    *   'S' (letter) vs. '5' (digit)
    *   'B' (letter) vs. '8' (digit)
    *   'G' (letter) vs. '6' (digit)
    *   'Z' (letter) vs. '2' (digit)
    *   '<' is a filler character, do not mistake it for a letter.
    Double and triple-check your interpretation of every single character.

2.  **Field Parsing:**
    *   **Names:** The surname and given name fields are separated by '<<'. All names are terminated by a filler character '<'. Any filler characters within a name should be replaced with a space. For example, 'DOE<JOHN' should be parsed as surname 'DOE' and given name 'JOHN'. 'SMITH<<JOHN<PAUL' should be parsed as surname 'SMITH' and given name 'JOHN PAUL'.
    *   **Sex:** The Sex field must be exactly 'M', 'F', or '<'. No other values are permitted.
    *   **Dates:** Date of Birth and Expiry Date must be in YYMMDD format.
    *   **Country Codes:** Issuing Country and Nationality must be 3-letter ISO 3166-1 alpha-3 codes.
    *   **Personal Number:** This field (also called "Optional Data") is typically on the second line of the MRZ, after the document expiry date and its checksum. It can be of variable length and is often padded with filler characters ('<'). Extract ONLY the alphanumeric characters that constitute the personal number itself, excluding any leading or trailing filler characters or characters that are clearly part of the expiry date's checksum. If the field is entirely composed of filler characters, return an empty string.

3.  **Checksums (Do Not Validate):** The MRZ contains checksum digits. Do not attempt to validate them. Your task is to read the characters as they appear, including the checksum digits themselves, but ensure they are not incorrectly included in adjacent fields (like the Personal Number).

4.  **Final Review:** Before finalizing the output, review all extracted fields against the MRZ lines in the image one last time to ensure complete accuracy.

Image with MRZ to be processed:
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
