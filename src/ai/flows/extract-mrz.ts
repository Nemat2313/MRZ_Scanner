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

2.  **Field Parsing (TD3 Format - 2 lines, 44 chars each):**
    *   **Line 1:**
        *   \`documentType\`: Chars 1-2.
        *   \`issuingCountry\`: Chars 3-5.
        *   \`surname\` & \`givenName\`: Chars 6-44. Surname and given names are separated by '<<'. All names are terminated by a filler character '<'. Replace internal '<' with a space. E.g., 'DOE<JOHN' -> surname 'DOE', givenName 'JOHN'. 'SMITH<<JOHN<PAUL' -> surname 'SMITH', givenName 'JOHN PAUL'.
    *   **Line 2:**
        *   \`documentNumber\`: Chars 1-9. This field is **exactly 9 characters**.
        *   **Checksum 1:** Char 10. A checksum digit for the document number. **Do not include this in any field.**
        *   \`nationality\`: Chars 11-13.
        *   \`dateOfBirth\`: Chars 14-19 (YYMMDD format).
        *   **Checksum 2:** Char 20. A checksum digit for the date of birth. **Do not include this in any field.**
        *   \`sex\`: Char 21. Must be 'M', 'F', or '<'.
        *   \`expiryDate\`: Chars 22-27 (YYMMDD format).
        *   **Checksum 3:** Char 28. A checksum digit for the expiry date. **Do not include this in any field.**
        *   \`personalNumber\`: Chars 29-42. This field contains the personal number. It can be of variable length and is padded with filler characters ('<'). Extract **only** the alphanumeric characters that constitute the personal number itself, excluding any trailing filler characters. If the field is entirely composed of filler characters ('<<<<...'), return an empty string.
        *   **Checksum 4:** Char 43. A checksum for the personal number. **Do not include this in any field.**
        *   **Final Checksum:** Char 44. An overall checksum for Line 2. **Do not include this in any field.**

3.  **Checksums (Do Not Validate or Include):** The MRZ contains checksum digits. Your task is to read the primary data characters as they appear, but **you must not include the checksum digits themselves in the extracted data fields** (\`documentNumber\`, \`dateOfBirth\`, \`expiryDate\`, \`personalNumber\`).

4.  **Final Review:** Before finalizing the output, review all extracted fields against the MRZ lines in the image one last time to ensure complete accuracy based on the precise field positions defined above.

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
