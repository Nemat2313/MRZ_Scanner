
// @/services/yandex.ts
export class YandexGPT {
  private apiKey: string;
  private folderId: string;
  private readonly CHAT_URL = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';

  constructor() {
    this.apiKey = process.env.YANDEX_API_KEY!;
    this.folderId = process.env.YANDEX_FOLDER_ID!;

    if (!this.apiKey || !this.folderId) {
      throw new Error('YANDEX_API_KEY or YANDEX_FOLDER_ID environment variable not set.');
    }
  }

  public async getChatCompletion(prompt: string, imageBase64: string): Promise<string> {
    const body = {
      modelUri: `gpt://${this.folderId}/yandexgpt/latest`,
      completionOptions: {
        stream: false,
        temperature: 0.1,
        maxTokens: '1024',
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
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        },
      ],
    };

    const response = await fetch(this.CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Key ${this.apiKey}`,
        'x-folder-id': this.folderId,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('YandexGPT API Error:', response.status, response.statusText, errorBody);
        throw new Error(`YandexGPT API request failed. Status: ${response.status}. Body: ${errorBody}`);
    }

    const responseData = await response.json();
    
    if (responseData.result && responseData.result.alternatives && responseData.result.alternatives.length > 0 && responseData.result.alternatives[0].message.text) {
        return responseData.result.alternatives[0].message.text;
    }
    
    console.error('Invalid response structure from YandexGPT:', responseData);
    throw new Error('No valid response choice from YandexGPT.');
  }

   public async getTextCompletion(prompt: string): Promise<string> {
    const body = {
      modelUri: `gpt://${this.folderId}/yandexgpt-lite/latest`,
      completionOptions: {
        stream: false,
        temperature: 0.6,
        maxTokens: '2000',
      },
      messages: [
        {
          role: 'user',
          text: prompt,
        },
      ],
    };

    const response = await fetch(this.CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Key ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('YandexGPT Text API Error:', response.status, response.statusText, errorBody);
      throw new Error(`YandexGPT API request failed. Status: ${response.status}. Body: ${errorBody}`);
    }

    const responseData = await response.json();

    if (responseData.result?.alternatives?.[0]?.message?.text) {
      return responseData.result.alternatives[0].message.text;
    }

    console.error('Invalid text response structure from YandexGPT:', responseData);
    throw new Error('No valid text response choice from YandexGPT.');
  }
}
