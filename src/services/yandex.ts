import axios from 'axios';

const API_URL = 'https://ocr.api.cloud.yandex.net/ocr/v1/recognizeText';

export class YandexOCRService {
  private apiKey: string;
  private folderId: string;

  constructor() {
    if (!process.env.YANDEX_API_KEY || !process.env.YANDEX_FOLDER_ID) {
      throw new Error(
        'Yandex API Key and Folder ID must be provided in .env file.'
      );
    }
    this.apiKey = process.env.YANDEX_API_KEY;
    this.folderId = process.env.YANDEX_FOLDER_ID;
  }

  public async recognizeText(
    base64Image: string,
    mimeType: string
  ): Promise<string> {
    const requestBody = {
      mimeType: mimeType,
      languageCodes: ['*'], // Recognize all languages
      model: 'page',
      content: base64Image,
    };

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Api-Key ${this.apiKey}`,
      'x-folder-id': this.folderId,
    };

    try {
      const response = await axios.post(API_URL, requestBody, { headers });

      if (
        response.data &&
        response.data.result &&
        response.data.result.textAnnotation &&
        response.data.result.textAnnotation.fullText
      ) {
        return response.data.result.textAnnotation.fullText;
      } else {
        console.error('Invalid response structure from Yandex OCR:', response.data);
        throw new Error('Received an invalid or empty response from Yandex OCR.');
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error(
          `Yandex OCR API request failed with status ${error.response.status}:`,
          error.response.data
        );
        throw new Error(
          `Yandex OCR API request failed: ${
            error.response.data?.message || error.message
          }`
        );
      }
      console.error('Error recognizing text with Yandex OCR:', error);
      throw new Error('Yandex OCR failed to analyze the image.');
    }
  }
}
