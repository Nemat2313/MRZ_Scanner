'use server';

import type { MrzData } from '@/types';
import { GoogleAIService } from '@/services/google-ai';

export interface ExtractMrzDataInput {
  photoDataUri: string;
}

export async function extractMrzData(
  input: ExtractMrzDataInput
): Promise<MrzData> {
  const googleAiService = new GoogleAIService();

  const prompt = `Вы — OCR-система мирового класса, специализирующаяся на анализе машиночитаемых зон (MRZ) и визуальном осмотре государственных документов. Ваша задача — извлечь информацию с максимальной точностью.

Сначала обработайте данные MRZ. Затем осмотрите остальную часть изображения документа (визуальную зону, VIZ), чтобы найти поля 'dateOfIssue', 'placeOfBirth' и 'authority'.

КРИТИЧЕСКИЕ ИНСТРУКЦИИ:
1.  **Перекрестная проверка для точности**: Для полей, которые есть и в VIZ, и в MRZ (фамилия, имя, номер документа и т.д.), вы ДОЛЖНЫ сравнить значения из обеих зон. Значение из VIZ обычно более полное и точное; используйте его как основной источник, а MRZ — для проверки.
2.  **Источник полей и форматирование**:
    *   **Поля для перекрестной проверки**: 'documentType', 'issuingCountry', 'surname', 'givenName', 'documentNumber', 'nationality', 'dateOfBirth', 'sex', 'expiryDate', 'personalNumber'.
    *   **Поля только из VIZ**: 'dateOfIssue', 'placeOfBirth', 'authority'. Если их нет, верните пустую строку.
    *   **Имена ('surname' & 'givenName')**: Извлеките из VIZ и MRZ. Итоговое значение должно быть полным именем как на странице с фото. Замените символы '<' из MRZ на пробел.
    *   **Даты ('dateOfBirth', 'expiryDate', 'dateOfIssue')**: Найдите дату в любом формате (например, 25 08 2015, 25/08/2015) и ВСЕГДА переформатируйте в DD.MM.YYYY.
3.  **Формат вывода**:
    *   Отвечайте ТОЛЬКО одним валидным JSON-объектом.
    *   Не включайте никакого пояснительного текста или markdown-разметки ('''json''') до или после JSON.
    *   Если поле не найдено, верните его как пустую строку.

Проанализируйте следующее изображение документа и верните JSON.`;

  const mimeType = input.photoDataUri.substring(
    input.photoDataUri.indexOf(':') + 1,
    input.photoDataUri.indexOf(';')
  );
  const base64Image = input.photoDataUri.split(',')[1];

  const mrzData = await googleAiService.analyzeImage(prompt, base64Image, mimeType);

  if (!mrzData.documentNumber) {
    throw new Error('Failed to extract a valid Document Number from the MRZ.');
  }

  return mrzData;
}
