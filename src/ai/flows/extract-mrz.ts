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

export async function extractMrzFromText(input: ExtractMrzTextInput): Promise<MrzDataType> {
    const { ocrText } = input;
    
    const prompt = `You are a world-class system with specialized expertise in parsing Machine-Readable Zones (MRZ) and visually inspected data from government-issued identity documents. You will be given raw text extracted by an OCR engine. Your task is to analyze this text, find the relevant information, and return it as a JSON object.

The provided text may contain OCR errors and extraneous information. Focus on finding patterns that match MRZ lines (usually starting with 'P<', 'I<', 'V<') and other visible data fields.

CRITICAL INSTRUCTIONS:
1.  **Analyze the OCR Text:** Carefully read the entire text provided below. Identify lines that constitute the MRZ and other data fields like 'Date of Issue', 'Place of Birth', and 'Authority'.
2.  **Character Correction:** Be aware of common OCR errors. 'O' is a letter, '0' is a digit. 'I' is a letter, '1' is a digit. '<' is a filler character. Correct these based on context.
3.  **Field Parsing by Format:** Parse fields based on standard TD1, TD2, or TD3 MRZ formats.
4.  **Country-Specific Rules:**
    *   **Uzbekistan (UZB):** 
        *   The \`personalNumber\` is a 14-digit number. Ensure you extract exactly 14 digits for this field if the issuing country is UZB.
5.  **Output Formatting Rules:**
    *   **Names:** Replace all filler '<' characters with a single space. For example, "DOE<<JOHN<PAUL" should become "DOE JOHN PAUL".
    *   **Document Number:** This field is mandatory. If you cannot find a valid Document Number, the entire process fails.
    *   **Empty fields:** If a field is not found or is entirely composed of filler characters ('<<<<<<<<<<'), return an empty string for it.
    *   Return all other fields exactly as they are read from their designated positions, excluding checksum digits.

Process the document text and respond ONLY with a valid JSON object with the following keys: "documentType", "issuingCountry", "surname", "givenName", "documentNumber", "nationality", "dateOfBirth", "sex", "expiryDate", "personalNumber", "dateOfIssue", "placeOfBirth", "authority". Do not include any explanatory text, markdown, or code block syntax before or after the JSON object. Just the raw JSON.

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
