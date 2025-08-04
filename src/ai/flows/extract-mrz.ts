'use server';

/**
 * @fileOverview Extracts MRZ data from a document image using YandexGPT.
 *
 * - extractMrz - A function that extracts Machine-Readable Zone (MRZ) data from an image.
 * - ExtractMrzInput - The input type for the extractMrz function.
 * - MrzData - The return type for the extractMrz function, which is also defined in `src/types`.
 */
import { YandexGPT } from '@/services/yandex';
import type { MrzData as MrzDataType } from '@/types';

export interface ExtractMrzInput {
  photoDataUri: string;
}

const yandexGpt = new YandexGPT();

function cleanJsonString(jsonString: string): string {
    // Remove ```json markdown and any trailing ```
    return jsonString.replace(/^```json\s*|```$/g, '');
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
        console.error("Failed to parse YandexGPT JSON response:", error);
        console.error("Original response text:", cleanedResponse);
        throw new Error("Could not parse the structured data from the AI response.");
    }
}

export async function extractMrz(input: ExtractMrzInput): Promise<MrzDataType> {
    const { photoDataUri } = input;
    
    // IMPORTANT: Sending only the base64 part of the data URI.
    const base64Image = photoDataUri.split(',')[1];
    
    const prompt = `You are a world-class OCR system with specialized expertise in parsing Machine-Readable Zones (MRZ) and visually inspecting government-issued identity documents. Your task is to extract information with maximum accuracy and return it as a JSON object.

First, process the MRZ data according to the critical instructions below.
Second, visually inspect the rest of the document image (outside of the MRZ) to find the 'dateOfIssue', 'placeOfBirth', and 'authority' fields. If these fields are not found, return them as empty strings.

If the provided document has multiple pages (e.g., a PDF), first locate the single page that contains the Machine-Readable Zone (MRZ) at the bottom. All subsequent parsing must be performed ONLY on that specific page.

CRITICAL INSTRUCTIONS (MRZ Parsing):
1.  **Character Accuracy:** Be extremely careful about common OCR errors. 'O' is a letter, '0' is a digit. 'I' is a letter, '1' is a digit. '<' is a filler character. Double-check every character.
2.  **Field Parsing by Format:** Parse fields based on standard TD1, TD2, or TD3 MRZ formats.
3.  **Country-Specific Rules:**
    *   **Uzbekistan (UZB):** 
        *   The \`personalNumber\` is a 14-digit number. Ensure you extract exactly 14 digits for this field if the issuing country is UZB.
        *   If the issuing country is UZB and the surname starts with "UZB" (e.g., "UZBERGASHOV"), remove this prefix. "UZBERGASHOV" should become "ERGASHOV".
4.  **Output Formatting Rules:**
    *   **Names:** Replace filler '<' characters with a single space.
    *   **Document Number:** This field is mandatory. If you cannot extract a valid Document Number, the entire process fails.
    *   **Empty fields:** If a field is entirely composed of filler characters ('<<<<<<<<<<'), return an empty string for it.
    *   Return all other fields exactly as they are read from their designated positions, excluding checksum digits.

Process the document and respond ONLY with a valid JSON object with the following keys: "documentType", "issuingCountry", "surname", "givenName", "documentNumber", "nationality", "dateOfBirth", "sex", "expiryDate", "personalNumber", "dateOfIssue", "placeOfBirth", "authority". Do not include any explanatory text before or after the JSON object.`;

    // Pass the base64 string directly to the service
    const response = await yandexGpt.getChatCompletion(prompt, base64Image);
    const mrzData = parseYandexGPTResponse(response);

    if (!mrzData.documentNumber) {
        throw new Error('Failed to extract a valid Document Number from the MRZ.');
    }

    return mrzData;
}
