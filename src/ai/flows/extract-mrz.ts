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
import type { MrzData as MrzDataType } from '@/types';

const ExtractMrzInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a document containing an MRZ, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type ExtractMrzDataInput = z.infer<typeof ExtractMrzInputSchema>;

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
  dateOfIssue: z.string().optional().describe("The date of issue of the document. Can be an empty string if not found."),
  placeOfBirth: z.string().optional().describe("The place of birth of the holder. Can be an empty string if not found."),
  authority: z.string().optional().describe("The issuing authority of the document. Can be an empty string if not found."),
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
      model: 'googleai/gemini-pro',
      input: { schema: ExtractMrzInputSchema },
      output: { schema: MrzDataSchema },
      prompt: `You are a world-class OCR system with specialized expertise in parsing Machine-Readable Zones (MRZ) and visually inspecting government-issued identity documents. Your task is to extract information with maximum accuracy.

First, process the MRZ data according to the critical instructions below.
Second, visually inspect the rest of the document image (outside of the MRZ) to find the 'dateOfIssue', 'placeOfBirth', and 'authority' fields. If these fields are not found, return them as empty strings.

If the provided document has multiple pages (e.g., a PDF), first locate the single page that contains the Machine-Readable Zone (MRZ) at the bottom. All subsequent parsing must be performed ONLY on that specific page.

CRITICAL INSTRUCTIONS:
1.  **Cross-Reference for Accuracy**: For fields that appear in BOTH the photo page (VIZ) and the MRZ (like surname, given names, document number, date of birth, etc.), you MUST compare the values from both zones. The value from the photo page (VIZ) is generally more complete and accurate and should be preferred, especially for names. Use the MRZ to validate, but the VIZ is the primary source for the final presentable value.
2.  **Field-Specific Sourcing & Formatting**:
    *   **Fields to Cross-Reference**: 'documentType', 'issuingCountry', 'surname', 'givenName', 'documentNumber', 'nationality', 'dateOfBirth', 'sex', 'expiryDate', 'personalNumber'.
    *   **Fields from Photo Page ONLY**: 'dateOfIssue', 'placeOfBirth', 'authority'. These do not exist in the MRZ. If you cannot find them on the photo page, return an empty string for those fields.
    *   **Names ('surname' & 'givenName')**: Extract from both VIZ and MRZ. The final value must be the full name as written on the photo page. Replace any '<' characters from the MRZ with a single space.
    *   **Dates ('dateOfBirth', 'expiryDate', 'dateOfIssue')**: Find the date in any format (e.g., 25 08 2015, 25/08/2015, 25-08-2015, 2015.08.25) and ALWAYS reformat it to DD.MM.YYYY in the final JSON output.
3.  **Final Output Format**:
    *   Respond ONLY with a single, valid JSON object matching the defined output schema.
    *   Do not include any explanatory text, markdown (\`\`\`json\`\`\`), or any other characters before the opening '{' or after the closing '}' of the JSON object.
    *   If a field's value cannot be found or confidently extracted from any zone, return it as an empty string.

Analyze the following document image:
{{media url=photoDataUri}}
`,
       config: {
        temperature: 0.1, // Lower temperature for more deterministic, structured output
      },
    });

    const { output } = await prompt(input);
    if (!output || !output.documentNumber) {
      throw new Error('Failed to extract a valid Document Number from the MRZ.');
    }
    return output;
  }
);


export async function extractMrzData(input: ExtractMrzDataInput): Promise<MrzDataType> {
  const result = await extractMrzFlow(input);
  return result as MrzDataType;
}
