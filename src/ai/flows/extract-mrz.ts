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
    
    const prompt = `You are an expert at extracting passport information from OCR text that contains both the photo page (Visual Inspection Zone - VIZ) and the MRZ (Machine Readable Zone). Your task is to analyze the provided OCR text, cross-reference information between the VIZ and MRZ for accuracy, and return a single, clean JSON object.

CRITICAL INSTRUCTIONS:
1.  **Cross-Reference for Accuracy**: For fields that appear in BOTH the photo page and the MRZ (like surname, given names, document number, date of birth, etc.), compare the values from both zones. The value from the photo page (VIZ) is generally more complete and should be preferred, especially for names. Use the MRZ to validate, but the VIZ is the primary source for final presentation.
2.  **Field-Specific Sourcing**:
    *   **Fields to Cross-Reference**: 'documentType', 'issuingCountry', 'surname', 'givenName', 'documentNumber', 'nationality', 'dateOfBirth', 'sex', 'expiryDate', 'personalNumber'.
    *   **Fields from Photo Page ONLY**: 'dateOfIssue', 'placeOfBirth', 'authority'. These do not exist in the MRZ.
3.  **Extraction and Formatting Rules**:
    *   **documentType**: Get from the first letter of the MRZ line 1.
    *   **issuingCountry**: Get from the MRZ line 1, positions 3-5. Validate with the country name on the photo page.
    *   **surname & givenName**: Extract from both VIZ and MRZ. The final value should be the full name as written on the photo page. Replace any '<' characters from the MRZ with a single space.
    *   **documentNumber**: Extract from both VIZ and MRZ. Ensure they match.
    *   **nationality**: Extract from the VIZ. Validate with the nationality code in the MRZ.
    *   **dateOfBirth & expiryDate**: Extract from the MRZ. Validate with the dates on the photo page if available.
    *   **sex**: Extract from the MRZ. Validate with the photo page if available.
4.  **Output Format**:
    *   Respond ONLY with a valid JSON object with the keys: "documentType", "issuingCountry", "surname", "givenName", "documentNumber", "nationality", "dateOfBirth", "sex", "expiryDate", "personalNumber", "dateOfIssue", "placeOfBirth", "authority".
    *   Do not include any explanatory text, markdown, or code block syntax before or after the JSON object. Just the raw JSON.
    *   If a field cannot be found in any zone, return it as an empty string "".

Here is the OCR text to analyze:
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
