import type { MrzData } from '@/types';
import axios from 'axios';

const API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent';

function cleanJsonString(jsonString: string): string {
  const match = jsonString.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) {
    console.error('No valid JSON object found in the AI response.');
    return '{}';
  }
  return match[0];
}

function parseGoogleAIResponse(responseText: string): MrzData {
  const cleanedResponse = cleanJsonString(responseText);
  try {
    const parsed = JSON.parse(cleanedResponse);
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
      dateOfIssue: parsed.dateOfIssue || '',
      placeOfBirth: parsed.placeOfBirth || '',
      authority: parsed.authority || '',
    };
  } catch (error) {
    console.error('Failed to parse Google AI JSON response:', error);
    console.error('Original cleaned response text:', cleanedResponse);
    throw new Error(
      'Could not parse the structured data from the AI response.'
    );
  }
}

export class GoogleAIService {
  private apiKey: string;

  constructor() {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('Google API Key must be provided in .env file.');
    }
    this.apiKey = process.env.GOOGLE_API_KEY;
  }

  public async analyzeImage(
    prompt: string,
    base64Image: string,
    mimeType: string
  ): Promise<MrzData> {
    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 32,
        topP: 1,
        maxOutputTokens: 4096,
        stopSequences: [],
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
      ],
    };

    try {
      const response = await axios.post(
        `${API_URL}?key=${this.apiKey}`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (
        response.data &&
        response.data.candidates &&
        response.data.candidates[0].content &&
        response.data.candidates[0].content.parts &&
        response.data.candidates[0].content.parts[0].text
      ) {
        const responseText = response.data.candidates[0].content.parts[0].text;
        return parseGoogleAIResponse(responseText);
      } else {
        console.error('Invalid response structure from Google AI:', response.data);
        if (response.data?.promptFeedback?.blockReason) {
            throw new Error(`Request was blocked by Google AI. Reason: ${response.data.promptFeedback.blockReason}`);
        }
        throw new Error('Received an invalid or empty response from Google AI.');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error(
          `Google AI API request failed with status ${error.response.status}:`,
          error.response.data
        );
        throw new Error(
          `Google AI API request failed: ${
            error.response.data?.error?.message || error.message
          }`
        );
      }
      console.error('Error analyzing image with Google AI:', error);
      throw new Error('Google AI failed to analyze the image.');
    }
  }
}
