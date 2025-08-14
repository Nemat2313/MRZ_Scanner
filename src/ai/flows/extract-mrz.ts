'use server';

import type { MrzData } from '@/types';
import { YandexOCRService, YandexGPTService } from '@/services/yandex';

export interface ExtractMrzDataInput {
  photoDataUri: string;
}

/**
 * Cleans a string to extract only the JSON part.
 * It looks for the first '{' or '[' and the last '}' or ']'
 * and returns the content between them.
 * @param jsonString The potentially messy string from the AI.
 * @returns A cleaned string that should be valid JSON.
 */
function cleanJsonString(jsonString: string): string {
  const match = jsonString.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  return match ? match[0] : '';
}

/**
 * Parses the JSON response from YandexGPT, handling potential variations in field names (English/Russian).
 * @param responseText The raw string response from the AI.
 * @returns An MrzData object.
 */
function parseYandexGPTResponse(responseText: string): MrzData {
  const cleanedResponse = cleanJsonString(responseText);
  try {
    // The response might be a JSON array with a single object, or just the object.
    const parsed = JSON.parse(cleanedResponse);
    const data = Array.isArray(parsed) ? parsed[0] : parsed;

    if (!data) {
      throw new Error('Parsed JSON is empty or null.');
    }

    // Map Russian and English keys to our standard MrzData fields
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
    console.error('Failed to parse YandexGPT JSON response:', error);
    console.error('Original cleaned response text:', cleanedResponse);
    throw new Error(
      'Could not parse the structured data from the AI response.'
    );
  }
}

export async function extractMrzData(
  input: ExtractMrzDataInput
): Promise<MrzData> {
  const yandexOcrService = new YandexOCRService();
  const yandexGptService = new YandexGPTService();

  const mimeType = input.photoDataUri.substring(
    input.photoDataUri.indexOf(':') + 1,
    input.photoDataUri.indexOf(';')
  );
  const base64Image = input.photoDataUri.split(',')[1];

  // Step 1: Extract raw text using Yandex OCR
  const fullText = await yandexOcrService.recognizeText(base64Image, mimeType);

  // Step 2: Send the raw text to YandexGPT for intelligent parsing
  const prompt = `Вы — экспертная система для анализа документов. Ваша задача — извлечь структурированные данные из предоставленного текста, который был получен с помощью OCR. Текст содержит как визуальную информацию (VIZ), так и машиночитаемую зону (MRZ).

КРИТИЧЕСКИЕ ИНСТРУКЦИИ:
1.  **Определение MRZ**: Машиночитаемая зона (MRZ) — это строки, содержащие последовательности символов '<<'. Сначала найдите эти строки.
2.  **Источник данных (ОБЯЗАТЕЛЬНО)**:
    *   Следующие поля ДОЛЖНЫ быть извлечены **ИСКЛЮЧИТЕЛЬНО** из строк MRZ (строк с '<<'): 'documentType', 'issuingCountry', 'surname', 'givenName', 'documentNumber', 'nationality', 'dateOfBirth', 'sex', 'expiryDate', 'personalNumber'.
    *   Следующие поля ДОЛЖНЫ быть найдены в остальной (визуальной) части текста: 'dateOfIssue', 'placeOfBirth', 'authority'.
3.  **Анализ и форматирование**:
    *   **'surname' & 'givenName'**: Извлеките из MRZ. Последовательности '<<' разделяют фамилию и имя. Замените все символы '<' на пробелы. Например, 'IVANOV<<IVAN<...' должно стать 'IVANOV IVAN'.
    *   **'placeOfBirth'**: Если вы видите сокращения типа 'RUSSIAN FEDE', вы должны распознать это как 'Russian Federation'.
    *   **'authority'**: Для паспортов Узбекистана (UZB) и других стран региона, если орган выдачи указан как 'MIA' и за ним следуют цифры (например, 'MIA 6206'), извлеките это значение как есть.
    *   **Даты ('dateOfBirth', 'expiryDate', 'dateOfIssue')**: Найдите дату в любом формате (например, 26 11 2017, 05.07.2025) и ВСЕГДА переформатируйте ее в формат DD.MM.YYYY.
4.  **Формат вывода**:
    *   Отвечайте ТОЛЬКО одним валидным JSON-объектом.
    *   Не включайте никакого пояснительного текста или markdown-разметки (например, \`\`\`json) до или после JSON.
    *   Если поле не найдено или не может быть извлечено, верните его как пустую строку "" или null.
    *   Поле 'documentNumber' ОБЯЗАТЕЛЬНО. Если его нет в MRZ, верните ошибку.

Проанализируйте следующий текст, извлеченный из документа, и верните JSON-объект:

--- НАЧАЛО ТЕКСТА ---
${fullText}
--- КОНЕЦ ТЕКСТА ---
`;

  const gptResponse = await yandexGptService.analyzeText(prompt);
  const mrzData = parseYandexGPTResponse(gptResponse);

  if (!mrzData.documentNumber) {
    throw new Error('Failed to extract a valid Document Number from the text.');
  }

  return mrzData;
}
