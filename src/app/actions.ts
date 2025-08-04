'use server';

import { extractMrz } from '@/ai/flows/extract-mrz';
import { YandexGPT } from '@/services/yandex';
import { z } from 'zod';

const extractActionSchema = z.object({
  photoDataUri: z.string(),
});

export async function extractMrzAction(values: { photoDataUri: string }) {
  const validated = extractActionSchema.safeParse(values);
  if (!validated.success) {
    return {
      success: false,
      error: 'Invalid input for MRZ extraction.',
    };
  }
  
  try {
    const result = await extractMrz({
      photoDataUri: validated.data.photoDataUri,
    });
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error extracting MRZ:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return {
      success: false,
      error: `Failed to extract MRZ data. Details: ${errorMessage}`,
    };
  }
}

export async function askYandexAction(prompt: string) {
  try {
    const yandexGpt = new YandexGPT();
    const result = await yandexGpt.getTextCompletion(prompt);
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error asking Yandex:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return {
      success: false,
      error: `Failed to get response from Yandex. Details: ${errorMessage}`,
    };
  }
}
