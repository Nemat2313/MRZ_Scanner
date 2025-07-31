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
  documentType: z.string().describe('The type of the document (e.g., P for Passport, I for ID Card).'),
  issuingCountry: z.string().describe('The three-letter code of the issuing country.'),
  surname: z.string().describe("The surname of the holder."),
  givenName: z.string().describe("The given name(s) of the holder."),
  documentNumber: z.string().describe('The passport or document number. MUST NOT BE EMPTY.'),
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
      prompt: `You are a world-class OCR system with specialized expertise in parsing Machine-Readable Zones (MRZ) from official government-issued identity documents. Your task is to extract information with maximum accuracy.

If the provided document has multiple pages (e.g., a PDF), first locate the single page that contains the Machine-Readable Zone (MRZ) at the bottom. All subsequent parsing must be performed ONLY on that specific page.

CRITICAL INSTRUCTIONS:
1.  **Character Accuracy:** Be extremely careful about common OCR errors. 'O' is a letter, '0' is a digit. 'I' is a letter, '1' is a digit. '<' is a filler character. Double-check every character.

2.  **Field Parsing by Format:**

    *   **TD3 Format (Passports - 2 lines, 44 chars each):**
        *   **Line 1:**
            *   Chars 1-2: Document Type. The first character is 'P' (for Passport). The second character is often '<'.
            *   Chars 3-5: Issuing Country (e.g., 'UTO').
            *   Chars 6-44: Surname and Given Names, separated by '<<'. Example: 'SURNAME<<GIVEN<NAMES<<<<'.
        *   **Line 2:**
            *   Chars 1-9: Document Number.
            *   Char 10: Checksum digit (ignore).
            *   Chars 11-13: Nationality.
            *   Chars 14-19: Date of Birth (YYMMDD).
            *   Char 20: Checksum digit (ignore).
            *   Char 21: Sex (M/F/<).
            *   Chars 22-27: Expiry Date (YYMMDD).
            *   Char 28: Checksum digit (ignore).
            *   Chars 29-42: Personal Number or optional data.
            *   Char 43: Checksum digit (ignore).
            *   Char 44: Final checksum (ignore).

    *   **TD1/TD2 Format (ID Cards - often 3 lines):**
        *   **Line 1 (TD1 example):**
            *   Chars 1-2: Document Type. The first character is 'I'. The second character can vary (e.g., 'D', 'V', '<').
            *   Chars 3-5: Issuing Country.
            *   Chars 6-14: Document Number.
            *   ... other fields
        *   **Examine all lines to correctly identify all fields based on standard MRZ formats.** For TD1/TD2, the Expiry Date and Personal Number might be on the second or third line. You must find them and parse them correctly, not mixing them with other fields.

3.  **Country-Specific Rules:**
    *   **Uzbekistan (UZB):** The \`personalNumber\` is a 14-digit number. Ensure you extract exactly 14 digits for this field if the issuing country is UZB.

4.  **Output Formatting Rules:**
    *   **Document Type:** For Passports (TD3), return the first character (usually 'P'). For ID Cards (TD1/TD2), return the first character (usually 'I'). No other characters should be present.
    *   **Document Number:** This field is mandatory. If you cannot extract a valid Document Number, you must fail the entire process. Do not return an empty string for this field.
    *   **Names:** Replace filler '<' characters with a single space. 'DOE<JOHN' becomes surname: 'DOE', givenName: 'JOHN'. 'SMITH<<JOHN<PAUL' becomes surname: 'SMITH', givenName: 'JOHN PAUL'.
    *   **Sex:** Must be 'M', 'F', or '<'. No other characters are valid.
    *   **Empty fields:** If a field is entirely composed of filler characters (e.g., '<<<<<<<<<<'), return an empty string for it, except for the Document Number.
    *   Return all other fields exactly as they are read from their designated positions, excluding checksum digits.

Process the MRZ from the following document.
{{media url=photoDataUri}}
`,
    });

    const { output } = await prompt(input);
    if (!output || !output.documentNumber) {
      throw new Error('Failed to extract a valid Document Number from the MRZ.');
    }
    return output;
  }
);


export async function extractMrz(input: ExtractMrzInput): Promise<MrzDataType> {
  const result = await extractMrzFlow(input);
  // The flow already returns the correct structure, we just need to satisfy TypeScript's type from /types
  return result as MrzDataType;
}
