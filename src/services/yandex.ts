import axios from 'axios';

const OCR_API_URL = 'https://ocr.api.cloud.yandex.net/ocr/v1/recognizeText';
const GPT_API_URL =
  'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';

abstract class YandexService {
  protected apiKey: string;
  protected folderId: string;

  constructor() {
    // In a real app, prefer environment variables for security.
    // For this prototype, we are temporarily hardcoding them.
    // Make sure to replace these with process.env.YANDEX_API_KEY etc. later.
    this.apiKey = process.env.YANDEX_API_KEY!;
    this.folderId = process.env.YANDEX_FOLDER_ID!;

    if (!this.apiKey || !this.folderId) {
      throw new Error(
        'Yandex API Key and Folder ID must be provided in .env file.'
      );
    }
  }
}

export class YandexOCRService extends YandexService {
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
      const response = await axios.post(OCR_API_URL, requestBody, { headers });

      if (
        response.data &&
        response.data.result &&
        response.data.result.textAnnotation &&
        response.data.result.textAnnotation.fullText
      ) {
        return response.data.result.textAnnotation.fullText;
      } else {
        console.error(
          'Invalid response structure from Yandex OCR:',
          response.data
        );
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

export class YandexGPTService extends YandexService {
  public async analyzeText(prompt: string): Promise<string> {
    const requestBody = {
      modelUri: `gpt://${this.folderId}/yandexgpt-lite`,
      completionOptions: {
        stream: false,
        temperature: 0.1,
        maxTokens: '2000',
      },
      messages: [
        {
          role: 'system',
          text: 'You are an expert JSON API that extracts data from text.',
        },
        {
          role: 'user',
          text: prompt,
        },
      ],
    };

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Api-Key ${this.apiKey}`,
    };

    try {
      const response = await axios.post(GPT_API_URL, requestBody, { headers });

      if (
        response.data &&
        response.data.result &&
        response.data.result.alternatives &&
        response.data.result.alternatives[0].message
      ) {
        return response.data.result.alternatives[0].message.text;
      } else {
        console.error(
          'Invalid response structure from YandexGPT:',
          response.data
        );
        throw new Error(
          'Received an invalid or empty response from YandexGPT.'
        );
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error(
          `YandexGPT API request failed with status ${error.response.status}:`,
          error.response.data
        );
        throw new Error(
          `YandexGPT API request failed: ${
            error.response.data?.message || error.message
          }`
        );
      }
      console.error('Error analyzing text with YandexGPT:', error);
      throw new Error('YandexGPT failed to analyze the text.');
    }
  }
}
