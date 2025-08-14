'use server';

import type { MrzData, ExtractMrzResponse } from '@/types';
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
  // Find the first occurrence of '{' or '['
    const firstBracket = jsonString.search(/[[{]/);
    if (firstBracket === -1) {
        return '';
    }

    // Find the last occurrence of '}' or ']'
    let lastBracket = -1;
    for (let i = jsonString.length - 1; i >= 0; i--) {
        if (jsonString[i] === '}' || jsonString[i] === ']') {
            lastBracket = i;
            break;
        }
    }

    if (lastBracket === -1) {
        return '';
    }

    // Extract the substring between the first and last brackets (inclusive)
    return jsonString.substring(firstBracket, lastBracket + 1);
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
): Promise<ExtractMrzResponse> {
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
  const prompt = `Вы — высокоточная система анализа документов. Ваша задача — извлечь структурированные данные из текста, полученного с помощью OCR. Текст содержит визуальную зону (VIZ) и машиночитаемую зону (MRZ).

КРИТИЧЕСКИ ВАЖНЫЕ ПРАВИЛА:

1.  **ОБНАРУЖЕНИЕ MRZ (Первый и главный шаг):**
    *   Найдите в тексте строки, содержащие множество символов '<'. Обычно они начинаются с 'P<', 'I<' или 'V<'. Это — Машиночитаемая Зона (MRZ).
    *   **ВСЕ ПОСЛЕДУЮЩИЕ ПРАВИЛА ЗАВИСЯТ ОТ ЭТОГО ШАГА!** Если вы не можете найти MRZ, дальнейший анализ невозможен.

2.  **ИСТОЧНИК ДАННЫХ (СТРОГОЕ РАСПРЕДЕЛЕНИЕ):**
    *   **ИСКЛЮЧИТЕЛЬНО ИЗ MRZ:** Следующие поля должны быть извлечены **ТОЛЬКО** из MRZ (строк с '<'). **ЗАПРЕЩЕНО** брать их из визуальной зоны (VIZ).
        *   \`documentType\`
        *   \`issuingCountry\`
        *   \`surname\`
        *   \`givenName\`
        *   \`documentNumber\`
        *   \`nationality\`
        *   \`dateOfBirth\`
        *   \`sex\`
        *   \`expiryDate\`
        *   \`personalNumber\`
    *   **ИСКЛЮЧИТЕЛЬНО ИЗ VIZ:** Следующие поля должны быть найдены **ТОЛЬКО** в остальной, визуальной части текста (где нет '<').
        *   \`dateOfIssue\`
        *   \`placeOfBirth\`
        *   \`authority\`

3.  **АНАЛИЗ И ФОРМАТИРОВАНИЕ (ОБЯЗАТЕЛЬНО К ИСПОЛНЕНИЮ):**
    *   **\`surname\` и \`givenName\`:** Извлеките из MRZ. Например, из 'P<UZBNEMATJONOVNA<<MAKHINUR<' \`surname\` будет 'NEMATJONOVNA', а \`givenName\` — 'MAKHINUR'. Все символы '<' должны быть заменены на ОДИН пробел. **Не используйте 'MAKH I NUR' из VIZ!**
    *   **Даты (\`dateOfBirth\`, \`expiryDate\`, \`dateOfIssue\`):** Найдите дату в любом формате и ВСЕГДА переформатируйте её в формат **DD.MM.YYYY**.
    *   **\`placeOfBirth\`:** Если видите сокращения типа 'RUSSIAN FEDE', вы должны распознать это как 'Russian Federation'.
    *   **\`authority\`:** Для паспортов Узбекистана (UZB) и других стран региона, если орган выдачи указан как 'MIA' и за ним следуют цифры (например, 'MIA 6206'), извлеките это значение как есть.

4.  **ФОРМАТ ВЫВОДА (ЕДИНСТВЕННО ВОЗМОЖНЫЙ):**
    *   Отвечайте **ТОЛЬКО** одним валидным JSON-объектом.
    *   Не включайте никакого пояснительного текста, markdown-разметки (например, \`\`\`json) или комментариев до или после JSON.
    *   Если поле не найдено в предназначенной для него зоне (MRZ или VIZ), верните его как пустую строку \`""\`.
    *   Поле \`documentNumber\` из MRZ **ОБЯЗАТЕЛЬНО**. Если его нет, это ошибка.

Проанализируйте следующий текст, строго следуя всем правилам, и верните JSON-объект:

--- НАЧАЛО ТЕКСТА ---
${fullText}
--- КОНЕЦ ТЕКСТА ---
`;

  const gptResponse = await yandexGptService.analyzeText(prompt);
  const mrzData = parseYandexGPTResponse(gptResponse);

  if (!mrzData.documentNumber) {
    throw new Error('Failed to extract a valid Document Number from the text.');
  }

  return { mrzData, rawOcrText: fullText };
}
