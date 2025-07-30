'use server';

import { extractMrz } from '@/ai/flows/extract-mrz';
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
    return {
      success: false,
      error: 'Failed to extract MRZ data. Please try again.',
    };
  }
}
