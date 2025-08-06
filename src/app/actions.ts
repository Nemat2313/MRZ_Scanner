'use server';

import { extractMrzFromText } from '@/ai/flows/extract-mrz';
import { YandexGPT } from '@/services/yandex';
import { z } from 'zod';

const extractActionSchema = z.object({
  ocrText: z.string(),
});

export async function analyzeMrzTextAction(values: { ocrText: string }) {
  const validated = extractActionSchema.safeParse(values);
  if (!validated.success) {
    return {
      success: false,
      error: 'Invalid input for MRZ analysis.',
    };
  }
  
  try {
    const result = await extractMrzFromText({
      ocrText: validated.data.ocrText,
    });
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error analyzing MRZ text:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return {
      success: false,
      error: `Failed to analyze MRZ data. Details: ${errorMessage}`,
    };
  }
}

// This function is kept for the Yandex Test component
export async function askYandexAction(prompt: string) {
  try {
    const yandexGpt = new YandexGPT();
    const result = await yandexGpt.getCompletion(prompt);
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
