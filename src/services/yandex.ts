// @/services/yandex.ts

// Helper function to convert data URI to Blob
async function dataUriToBlob(dataUri: string): Promise<Blob> {
  const response = await fetch(dataUri);
  const blob = await response.blob();
  return blob;
}

export class YandexGPT {
  private apiKey: string;
  private folderId: string;
  // This is the official and correct endpoint. The URL from the python script was likely a shorthand or old version.
  private readonly COMPLETION_URL = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';

  constructor() {
    this.apiKey = process.env.YANDEX_API_KEY!;
    this.folderId = process.env.YANDEX_FOLDER_ID!;

    if (!this.apiKey || !this.folderId) {
      throw new Error('YANDEX_API_KEY or YANDEX_FOLDER_ID environment variable not set.');
    }
  }

  // This method remains for the text-only test functionality
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

  // Updated method to handle file uploads, reverting to the documented JSON format which is the correct way.
  // The multipart/form-data examples are misleading for the llm.api.cloud.yandex.net endpoint.
  // The "empty message text" error was due to an incorrect JSON structure, which is corrected here.
  public async getChatCompletion(prompt: string, imageBase64: string): Promise<string> {
    
    const requestBody = {
      modelUri: `gpt://${this.folderId}/yandexgpt/latest`,
      completionOptions: {
        stream: false,
        temperature: 0.1,
        maxTokens: '2048',
      },
      messages: [
        {
          role: 'user',
          // Correct structure: content is an array with separate objects for text and image.
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                // The URL is the base64-encoded image data, prefixed with the data URI scheme.
                // It's crucial to send the full data URI, not just the base64 part.
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
    };

    const response = await fetch(this.COMPLETION_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Api-Key ${this.apiKey}`,
            'Content-Type': 'application/json',
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
}
