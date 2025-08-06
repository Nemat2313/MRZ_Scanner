'use server';

import {extractMrzData} from '@/ai/flows/extract-mrz';
import {z} from 'zod';
import type {ExtractMrzDataInput} from '@/ai/flows/extract-mrz';

const extractActionSchema = z.object({
  photoDataUri: z.string(),
});

export async function extractMrzDataAction(values: ExtractMrzDataInput) {
  const validated = extractActionSchema.safeParse(values);
  if (!validated.success) {
    return {
      success: false,
      error: 'Invalid input for MRZ analysis.',
    };
  }

  try {
    const result = await extractMrzData({
      photoDataUri: validated.data.photoDataUri,
    });
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error analyzing MRZ data with Gemini:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    return {
      success: false,
      error: `Failed to analyze MRZ data. Details: ${errorMessage}`,
    };
  }
}
