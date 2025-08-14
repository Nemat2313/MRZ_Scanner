'use server';

import {extractMrzData} from '@/ai/flows/extract-mrz';
import type {ExtractMrzDataInput} from '@/ai/flows/extract-mrz';

export async function extractMrzDataAction(values: ExtractMrzDataInput) {
  try {
    const result = await extractMrzData({
      photoDataUri: values.photoDataUri,
    });
    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error analyzing MRZ data with Genkit:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred.';
    return {
      success: false,
      error: `Failed to analyze MRZ data. Details: ${errorMessage}`,
    };
  }
}
