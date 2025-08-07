import axios from 'axios';
import type { MrzData } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const OAUTH_URL = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
const FILES_URL = 'https://gigachat.devices.sberbank.ru/api/v1/files';
const COMPLETIONS_URL = 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions';

interface Token {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: Token | null = null;

function cleanJsonString(jsonString: string): string {
    const match = jsonString.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return match ? match[0] : '';
}

function parseGigaChatResponse(responseText: string): MrzData {
    const cleanedResponse = cleanJsonString(responseText);
    try {
        const parsed = JSON.parse(cleanedResponse);
        const data = Array.isArray(parsed) ? parsed[0] : parsed;

        return {
            documentType: data.documentType || data.тип_документа || '',
            issuingCountry: data.issuingCountry || data.страна_выдачи || '',
            surname: data.surname || data.фамилия || '',
            givenName: data.givenName || data.имя || '',
            documentNumber: data.documentNumber || data.номер_документа || '',
            nationality: data.nationality || data.гражданство || '',
            dateOfBirth: data.dateOfBirth || data.дата_рождения || '',
            sex: data.sex || data.пол || '',
            expiryDate: data.expiryDate || data.срок_действия || '',
            personalNumber: data.personalNumber || data.личный_номер || '',
            dateOfIssue: data.dateOfIssue || data.дата_выдачи || undefined,
            placeOfBirth: data.placeOfBirth || data.место_рождения || undefined,
            authority: data.authority || data.орган_выдачи || undefined,
        };
    } catch (error) {
        console.error("Failed to parse GigaChat JSON response:", error);
        console.error("Original response text:", cleanedResponse);
        throw new Error("Could not parse the structured data from the AI response.");
    }
}

export class GigaChat {
  private clientId: string;
  private clientSecret: string;

  constructor(clientId: string, clientSecret: string) {
    if (!clientId || !clientSecret) {
      throw new Error('GigaChat client ID and secret must be provided.');
    }
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  private async getAccessToken(): Promise<string> {
    if (tokenCache && tokenCache.expiresAt > Date.now()) {
      return tokenCache.accessToken;
    }

    try {
      const authData = new URLSearchParams();
      authData.append('scope', 'GIGACHAT_API_PERS');

      const response = await axios.post(
        OAUTH_URL,
        authData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'RqUID': uuidv4(),
            'Authorization': `Bearer ${this.clientSecret}`,
          },
        }
      );
      
      const { access_token, expires_at } = response.data;
      tokenCache = {
        accessToken: access_token,
        expiresAt: expires_at,
      };
      
      return access_token;
    } catch (error) {
      const axiosError = error as import('axios').AxiosError;
      console.error('Error getting GigaChat access token:', axiosError.response?.data || axiosError.message);
      throw new Error('Could not authenticate with GigaChat.');
    }
  }

  public async uploadFile(fileBlob: Blob): Promise<string> {
    const accessToken = await this.getAccessToken();
    
    const formData = new FormData();
    formData.append('file', fileBlob, 'document.png');
    
    try {
      const response = await axios.post(FILES_URL, formData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });
      return response.data.id;
    } catch (error) {
      const axiosError = error as import('axios').AxiosError;
      console.error('Error uploading file to GigaChat:', axiosError.response?.data || axiosError.message);
      throw new Error('Could not upload file to GigaChat.');
    }
  }

  public async analyzeImage(fileId: string, prompt: string): Promise<MrzData> {
    const accessToken = await this.getAccessToken();

    try {
      const response = await axios.post(
        COMPLETIONS_URL,
        {
          model: 'GigaChat-Pro',
          messages: [
            {
              role: 'user',
              content: prompt,
              attachments: [
                {
                  file_id: fileId,
                },
              ],
            },
          ],
          temperature: 0.1,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const content = response.data.choices[0].message.content;
      return parseGigaChatResponse(content);

    } catch (error) {
      const axiosError = error as import('axios').AxiosError;
      console.error('Error analyzing image with GigaChat:', axiosError.response?.data || axiosError.message);
      throw new Error('GigaChat failed to analyze the image.');
    }
  }
}
