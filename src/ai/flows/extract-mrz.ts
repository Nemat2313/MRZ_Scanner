'use server';
/**
 * @fileOverview Extracts MRZ data from a document image using Gemini.
 *
 * - extractMrzData - A function that handles the MRZ data extraction process.
 * - ExtractMrzDataInput - The input type for the extractMrzData function.
 * - MrzData - The return type for the extractMrzData function, which is also defined in `src/types`.
 */

import {ai} from '@/ai/genkit';
import type {MrzData as MrzDataType} from '@/types';
import {z} from 'zod';

// Define the schema for the input, which is a data URI of the photo
export const ExtractMrzDataInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a passport or ID card, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractMrzDataInput = z.infer<typeof ExtractMrzDataInputSchema>;

// Define the schema for the output data, matching the MrzData type
export const MrzDataSchema = z.object({
  documentType: z.string().describe("Document Type (e.g., 'P' for Passport)"),
  issuingCountry: z
    .string()
    .describe('Issuing Country or Organization (3-letter code, e.g., "USA")'),
  surname: z.string().describe("The full surname(s) of the holder."),
  givenName: z.string().describe('The full given name(s) of the holder.'),
  documentNumber: z.string().describe('The passport or ID card number.'),
  nationality: z.string().describe('Nationality of the holder (3-letter code)'),
  dateOfBirth: z
    .string()
    .describe(
      'Date of birth of the holder, formatted as DD.MM.YYYY. For example, "25.08.1985"'
    ),
  sex: z.string().describe('Sex of the holder ("M", "F", or "X")'),
  expiryDate: z
    .string()
    .describe(
      'Expiration date of the document, formatted as DD.MM.YYYY. For example, "25.08.2030"'
    ),
  personalNumber: z
    .string()
    .optional()
    .describe('Optional personal number or national identification number.'),
  dateOfIssue: z
    .string()
    .optional()
    .describe(
      'The date the document was issued, formatted as DD.MM.YYYY. For example, "25.08.2020"'
    ),
  placeOfBirth: z
    .string()
    .optional()
    .describe('The place of birth of the holder.'),
  authority: z
    .string()
    .optional()
    .describe('The authority that issued the document.'),
});
export type MrzData = z.infer<typeof MrzDataSchema>;

/**
 * Main function to call the Genkit flow for MRZ extraction.
 * @param input The input data containing the photo data URI.
 * @returns A promise that resolves to the extracted MRZ data.
 */
export async function extractMrzData(
  input: ExtractMrzDataInput
): Promise<MrzData> {
  const {output} = await mrzExtractionFlow(input);
  if (!output) {
    throw new Error('Flow did not produce a valid output.');
  }
  return output;
}

// Define the Genkit prompt for Gemini
const mrzPrompt = ai.definePrompt({
  name: 'mrzPrompt',
  input: {schema: ExtractMrzDataInputSchema},
  output: {schema: MrzDataSchema},
  prompt: `You are an expert system for extracting information from government-issued identity documents. Analyze the provided image, which contains both a visual inspection zone (VIZ) and a machine-readable zone (MRZ). Your task is to accurately extract the specified fields and return them in a structured JSON format.

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
  // Use a model capable of multimodal input
  config: {
    model: 'googleai/gemini-1.5-flash-preview',
    temperature: 0.1, // Lower temperature for more deterministic, structured output
  },
});

// Define the Genkit flow
const mrzExtractionFlow = ai.defineFlow(
  {
    name: 'mrzExtractionFlow',
    inputSchema: ExtractMrzDataInputSchema,
    outputSchema: MrzDataSchema,
  },
  async (input) => {
    // Run the prompt with the given input
    const llmResponse = await mrzPrompt(input);
    return llmResponse;
  }
);
