'use server';

import { enhanceScan } from '@/ai/flows/enhance-scan-quality';
import { z } from 'zod';

const actionSchema = z.object({
  photoDataUri: z.string(),
});

export async function enhanceImageAction(values: { photoDataUri: string }) {
  const validated = actionSchema.safeParse(values);
  if (!validated.success) {
    return {
      success: false,
      error: 'Invalid input.',
    };
  }

  try {
    const result = await enhanceScan({
      photoDataUri: validated.data.photoDataUri,
    });
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error enhancing scan:', error);
    return {
      success: false,
      error: 'Failed to enhance image. Please try again.',
    };
  }
}
