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
    
    const prompt = `You are an expert at extracting passport information from OCR text that contains both the photo page (Visual Inspection Zone - VIZ) and the MRZ (Machine Readable Zone). Your task is to analyze the provided OCR text, cross-reference information between the VIZ and MRZ for accuracy, and return a single, clean JSON object. The OCR text may contain errors and extraneous information; you must ignore it and focus only on passport data.

CRITICAL INSTRUCTIONS:
1.  **Cross-Reference for Accuracy**: For fields that appear in BOTH the photo page and the MRZ (like surname, given names, document number, date of birth, etc.), you MUST compare the values from both zones. The value from the photo page (VIZ) is generally more complete and accurate and should be preferred, especially for names. Use the MRZ to validate, but the VIZ is the primary source for the final presentable value.
2.  **Field-Specific Sourcing & Formatting**:
    *   **Fields to Cross-Reference**: 'documentType', 'issuingCountry', 'surname', 'givenName', 'documentNumber', 'nationality', 'dateOfBirth', 'sex', 'expiryDate', 'personalNumber'.
    *   **Fields from Photo Page ONLY**: 'dateOfIssue', 'placeOfBirth', 'authority'. These do not exist in the MRZ. If you cannot find them on the photo page, return an empty string.
    *   **surname & givenName**: Extract from both VIZ and MRZ. The final value must be the full name as written on the photo page. Replace any '<' characters from the MRZ with a single space.
    *   **dateOfBirth, expiryDate, dateOfIssue**: Find the date in any format (e.g., 25 08 2015, 25/08/2015, 25-08-2015, 2015.08.25) and ALWAYS reformat it to DD.MM.YYYY in the final JSON output.
3.  **Multi-Page Documents**: If the OCR text appears to be from a multi-page document (like a PDF), first locate the single section of text that contains the Machine-Readable Zone (MRZ) at the bottom. All subsequent parsing must be performed ONLY on the text from that specific page. Ignore all other pages.
4.  **Final Output Format**:
    *   Respond ONLY with a single, valid JSON object containing the keys: "documentType", "issuingCountry", "surname", "givenName", "documentNumber", "nationality", "dateOfBirth", "sex", "expiryDate", "personalNumber", "dateOfIssue", "placeOfBirth", "authority".
    *   Do not include any explanatory text, markdown (\` \`\`json \` \`), or any other characters before the opening '{' or after the closing '}' of the JSON object.
    *   If a field's value cannot be found or confidently extracted from any zone, return it as an empty string.

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
