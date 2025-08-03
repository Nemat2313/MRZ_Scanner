// @/services/gigachat.ts
import { v4 as uuidv4 } from 'uuid';

interface GigaChatToken {
  accessToken: string;
  expiresAt: number;
}

export class GigaChat {
  private token: GigaChatToken | null = null;
  private apiKey: string;
  private readonly TOKEN_URL = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
  private readonly CHAT_URL = 'https://ngw.devices.sberbank.ru:9443/api/v1/chat/completions';

  constructor() {
    this.apiKey = process.env.GIGACHAT_API_KEY!;
    if (!this.apiKey) {
      throw new Error('GIGACHAT_API_KEY environment variable not set.');
    }
  }

  private async getAccessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now()) {
      return this.token.accessToken;
    }

    console.log('Fetching new GigaChat access token...');
    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'RqUID': uuidv4(),
        'Authorization': `Basic ${this.apiKey}`,
      },
      body: new URLSearchParams({
        'scope': 'GIGACHAT_API_PERS'
      }),
      // As we are calling a service on a different host, we need to disable caching
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Failed to get GigaChat access token:', response.status, response.statusText, errorBody);
      throw new Error('Could not authenticate with GigaChat.');
    }

    const tokenData = await response.json();
    this.token = {
      accessToken: tokenData.access_token,
      expiresAt: tokenData.expires_at,
    };

    console.log('Successfully fetched new GigaChat access token.');
    return this.token.accessToken;
  }

  public async getChatCompletion(prompt: string, imageBase64: string): Promise<string> {
    const accessToken = await this.getAccessToken();

    const body = {
      model: "GigaChat:latest",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      // We are asking for a JSON response so we don't need too many tokens
      max_tokens: 1024,
    };

    const response = await fetch(this.CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('GigaChat API Error:', response.status, response.statusText, errorBody);
        throw new Error('GigaChat API request failed.');
    }

    const responseData = await response.json();
    if (responseData.choices && responseData.choices.length > 0 && responseData.choices[0].message.content) {
        return responseData.choices[0].message.content;
    }
    
    console.error('Invalid response structure from GigaChat:', responseData);
    throw new Error('No valid response choice from GigaChat.');
  }
}
