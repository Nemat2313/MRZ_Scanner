'use server';
/**
 * @fileOverview Extracts MRZ data from a document image using Gemini.
 *
 * - extractMrzData - A function that handles the MRZ data extraction process.
 */

import {ai} from '@/ai/genkit';
import {
  ExtractMrzDataInput,
  ExtractMrzDataInputSchema,
  MrzData,
  MrzDataSchema,
} from '@/types/mrz';

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
  model: 'googleai/gemini-1.5-pro-preview',
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
  config: {
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
