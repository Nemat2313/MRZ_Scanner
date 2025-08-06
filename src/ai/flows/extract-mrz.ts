'use server';

/**
 * @fileOverview Extracts MRZ data from OCR'd text using YandexGPT.
 *
 * - extractMrzFromText - A function that extracts Machine-Readable Zone (MRZ) data from a string.
 * - ExtractMrzTextInput - The input type for the extractMrzFromText function.
 * - MrzData - The return type for the extractMrzFromText function, which is also defined in `src/types`.
 */
import { YandexGPT } from '@/services/yandex';
import type { MrzData as MrzDataType } from '@/types';

export interface ExtractMrzTextInput {
  ocrText: string;
}

const yandexGpt = new YandexGPT();

function cleanJsonString(jsonString: string): string {
    // Remove ```json markdown and any other text before the first { and after the last }
    const startIndex = jsonString.indexOf('{');
    const endIndex = jsonString.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1) {
        return jsonString; // Return original if no JSON object is found
    }

    return jsonString.substring(startIndex, endIndex + 1);
}

function parseYandexGPTResponse(responseText: string): MrzDataType {
    const cleanedResponse = cleanJsonString(responseText.trim());
    try {
        const parsed = JSON.parse(cleanedResponse);
        // Ensure all fields are strings and handle optional fields
        return {
            documentType: parsed.documentType || '',
            issuingCountry: parsed.issuingCountry || '',
            surname: parsed.surname || '',
            givenName: parsed.givenName || '',
            documentNumber: parsed.documentNumber || '',
            nationality: parsed.nationality || '',
            dateOfBirth: parsed.dateOfBirth || '',
            sex: parsed.sex || '',
            expiryDate: parsed.expiryDate || '',
            personalNumber: parsed.personalNumber || '',
            dateOfIssue: parsed.dateOfIssue || undefined,
            placeOfBirth: parsed.placeOfBirth || undefined,
            authority: parsed.authority || undefined,
        };
    } catch (error) {
        console.error("Failed to parse YandexGPT JSON response.");
        console.error("Original raw response text from YandexGPT:", responseText);
        console.error("Cleaned response text before parsing:", cleanedResponse);
        throw new Error("Could not parse the structured data from the AI response.");
    }
}

export async function extractMrzFromText(input: ExtractMrzTextInput): Promise<MrzDataType> {
    const { ocrText } = input;
    
    const prompt = `You are an expert at extracting passport information from OCR text that contains both the photo page data and MRZ (Machine Readable Zone) data.

Analyze the OCR text carefully. If the document has multiple pages, first locate the single page that contains the Machine-Readable Zone (MRZ) at the bottom. All subsequent parsing must be performed ONLY on that specific page's text.
Then, extract the following fields and return them in a single JSON object.

1.  **documentType**: Extract from the first letter of the MRZ line 1 (usually 'P' for passport).
2.  **issuingCountry**: Extract from MRZ line 1 after the document type.
3.  **documentNumber**: Extract from MRZ line 2 (starts right after the line begins).
4.  **surname**: Extract from MRZ line 1, after the country code, until the '<<'. Replace any '<' with a single space.
5.  **givenName**: Extract from MRZ line 1, after the '<<' following surname, until the end of line. Replace any '<' with a single space.
6.  **nationality**: Extract from the photo page text, not from the MRZ.
7.  **dateOfBirth**: Extract from MRZ line 2 (positions 14–19).
8.  **sex**: Extract from MRZ line 2 (position 21).
9.  **dateOfIssue**: Extract from the photo page text, not from MRZ.
10. **expiryDate**: Extract from MRZ line 2 (positions 22–27).
11. **placeOfBirth**: Extract from the photo page text.
12. **authority**: Extract from the photo page text.
13. **personalNumber**: Extract from the MRZ if available.

All text should be in uppercase (if Latin), with no unnecessary characters. Avoid guessing missing fields — leave blank or null if not visible or not clearly extractable.

Respond ONLY with a valid JSON object with the keys: "documentType", "issuingCountry", "surname", "givenName", "documentNumber", "nationality", "dateOfBirth", "sex", "expiryDate", "personalNumber", "dateOfIssue", "placeOfBirth", "authority". Do not include any explanatory text, markdown, or code block syntax before or after the JSON object. Just the raw JSON.

Here is the OCR text:
---
${ocrText}
---
`;

    const response = await yandexGpt.getCompletion(prompt);
    const mrzData = parseYandexGPTResponse(response);

    if (!mrzData.documentNumber) {
        throw new Error('Failed to extract a valid Document Number from the provided text.');
    }

    return mrzData;
}
