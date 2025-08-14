'use server';

import type { MrzData } from '@/types';
import { YandexOCRService } from '@/services/yandex';

export interface ExtractMrzDataInput {
  photoDataUri: string;
}

export async function extractMrzData(
  input: ExtractMrzDataInput
): Promise<MrzData> {
  const yandexOcrService = new YandexOCRService();

  const mimeType = input.photoDataUri.substring(
    input.photoDataUri.indexOf(':') + 1,
    input.photoDataUri.indexOf(';')
  );
  const base64Image = input.photoDataUri.split(',')[1];

  const fullText = await yandexOcrService.recognizeText(base64Image, mimeType);

  // For now, we will throw the extracted text so we can see it in the UI.
  // This confirms the API call is working.
  // In the next step, we will parse this text.
  throw new Error(`Yandex OCR Result:\n\n${fullText}`);

  // This part will be implemented later
  /*
  const parsedData = parseTextToMrz(fullText);

  if (!parsedData.documentNumber) {
    throw new Error('Failed to extract a valid Document Number from the OCR text.');
  }

  return parsedData;
  */
}
