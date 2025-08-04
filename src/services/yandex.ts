// @/services/yandex.ts

export class YandexGPT {
  private apiKey: string;
  private folderId: string;
  private readonly COMPLETION_URL = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';

  constructor() {
    this.apiKey = process.env.YANDEX_API_KEY!;
    this.folderId = process.env.YANDEX_FOLDER_ID!;

    if (!this.apiKey || !this.folderId) {
      throw new Error('YANDEX_API_KEY or YANDEX_FOLDER_ID environment variable not set.');
    }
  }

  public async getChatCompletion(prompt: string, imageBase64: string): Promise<string> {
    
    // This is the correct structure for multimodal requests according to Yandex documentation.
    // The content is an array of objects, one for text and one for the image.
    const requestBody = {
      modelUri: `gpt://${this.folderId}/yandexgpt/latest`,
      completionOptions: {
        stream: false,
        temperature: 0.1, // Lower temperature for more deterministic output
        maxTokens: '2048', // Increased tokens for complex documents
      },
      messages: [
        {
          role: 'user',
          // The content itself is an array with text and image parts
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                // The URL is the base64-encoded image data itself, prefixed with the data URI scheme.
                // It is crucial to send the full data URI.
                url: `data:image/jpeg;base64,${imageBase64}`,
              }
            }
          ]
        },
      ],
    };

    const response = await fetch(this.COMPLETION_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Api-Key ${this.apiKey}`,
            'Content-Type': 'application/json',
            // The 'x-folder-id' header is deprecated but can be kept for compatibility.
            // It is not the primary way of specifying the folder anymore.
        },
        body: JSON.stringify(requestBody),
        cache: 'no-store',
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('YandexGPT API Error:', response.status, response.statusText, errorBody);
        throw new Error(`YandexGPT API request failed. Status: ${response.status}. Body: ${errorBody}`);
    }

    const responseData = await response.json();
    
    // Navigate through the correct response structure to get the text.
    if (responseData.result?.alternatives?.[0]?.message?.text) {
        return responseData.result.alternatives[0].message.text;
    }
    
    console.error('Invalid response structure from YandexGPT:', responseData);
    throw new Error('No valid response choice from YandexGPT.');
  }

   public async getTextCompletion(prompt: string): Promise<string> {
    const body = {
      modelUri: `gpt://${this.folderId}/yandexgpt-lite`,
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

    const response = await fetch(this.COMPLETION_URL, {
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
