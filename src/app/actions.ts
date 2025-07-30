'use server';

import { enhanceScan } from '@/ai/flows/enhance-scan-quality';
import { extractMrz } from '@/ai/flows/extract-mrz';
import { z } from 'zod';

const enhanceActionSchema = z.object({
  photoDataUri: z.string(),
});

export async function enhanceImageAction(values: { photoDataUri: string }) {
  const validated = enhanceActionSchema.safeParse(values);
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
