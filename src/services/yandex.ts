import type { MrzData } from '@/types';

const YANDEX_API_URL = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';

export class YandexGPT {
  private apiKey: string;
  private folderId: string;

  constructor() {
    if (!process.env.YANDEX_API_KEY || !process.env.YANDEX_FOLDER_ID) {
      throw new Error('Yandex API Key and Folder ID must be provided in .env file.');
    }
    this.apiKey = process.env.YANDEX_API_KEY;
    this.folderId = process.env.YANDEX_FOLDER_ID;
  }

  public async analyzeImage(prompt: string, imageBase64: string): Promise<string> {
    const body = {
      modelUri: `gpt://${this.folderId}/yandexgpt-lite`,
      completionOptions: {
        stream: false,
        temperature: 0.1,
        maxTokens: '2000',
      },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
    };

    try {
      const response = await fetch(YANDEX_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Api-Key ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Yandex API request failed with status ${response.status}:`, errorBody);
        throw new Error(`Yandex API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.result.alternatives[0].message.text;

    } catch (error) {
      console.error('Error analyzing image with YandexGPT:', error);
      throw new Error('YandexGPT failed to analyze the image.');
    }
  }
}
