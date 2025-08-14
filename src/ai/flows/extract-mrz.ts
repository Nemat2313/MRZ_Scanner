'use server';

import type { MrzData, ExtractMrzResponse } from '@/types';
import { YandexOCRService, YandexGPTService } from '@/services/yandex';

export interface ExtractMrzDataInput {
  photoDataUri: string;
  fileName: string;
}

/**
 * Parses the CSV string response from YandexGPT.
 * @param csvString The raw CSV string response from the AI.
 * @param fileName The original file name to include.
 * @returns An MrzData object.
 */
function parseCsvResponse(csvString: string): MrzData {
  const values = csvString.trim().split(',').map(v => v.trim());

  const headers = [
    'documentType', 'issuingCountry', 'surname', 'givenName', 
    'documentNumber', 'nationality', 'dateOfBirth', 'sex', 
    'expiryDate', 'personalNumber', 'dateOfIssue', 'placeOfBirth', 
    'authority'
  ];

  if (values.length < headers.length) {
      console.error('CSV response has too few columns.', {
          expected: headers.length,
          got: values.length,
          csvString
      });
      throw new Error(`AI returned incomplete data. Expected ${headers.length} columns, but got ${values.length}.`);
  }

  const data: Partial<MrzData> = {};
  headers.forEach((header, index) => {
      data[header as keyof MrzData] = values[index] || '';
  });

  return data as MrzData;
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
  const prompt = `Ты — строгий парсер паспортов. На входе у тебя есть Raw OCR Text (только текст, без изображения) и имя файла.
Задача: извлечь поля и вернуть одну строку CSV в точном порядке заголовков (см. ниже). Никаких пояснений, только CSV-строка.

Правила:

Сначала парсь MRZ (признак — много символов <). Паспортный формат TD3: 2 строки по 44 символа.

Разделитель полей в MRZ — <.

Document Type = первый символ первой строки (обычно P).

Issuing Country = позиции 3–5 первой строки (ISO3, напр. UZB).

Surname = из первой строки после P<XXX и до << (в UPPERCASE).

Given Name = всё, что после <<, включая все имена и отчества (все < заменяй на пробел, лишние пробелы убирай, в UPPERCASE). Например, если MRZ содержит <<MAKHINUR<NEMATJONOVNA, то Given Name = MAKHINUR NEMATJONOVNA.

Document Number = начало второй строки (поз. 1–9) до контрольной цифры. Убирай пробелы/<.

Nationality = ISO3 из второй строки (после номера и его чека).

Date of Birth = YYMMDD → DD.MM.YYYY (век определяй логично по дате истечения).

Sex = M или F.

Expiry Date = YYMMDD → DD.MM.YYYY.

Personal Number = всё между датой окончания и финальным контрольным числом; только буквы/цифры.

OCR-ошибки исправляй по контексту MRZ:

O↔0, I↔1, B↔8, G↔6, S↔5, Z↔2, кириллические М/А/В → латиница M/A/B.
Используй контрольные суммы MRZ для проверки.

Три поля только из не-MRZ текста:

Place of Birth: ищи рядом с PLACE OF BIRTH / TUG\'ILGAN JOYI. Исправляй усечённые значения (напр. RUSSIAN FEDE → RUSSIAN FEDERATION).

Authority: для паспортов Узбекистана — строка, начинающаяся на MIA/МИА и далее цифры. Верни в латинице как MIA ####.

Date of Issue: ищи рядом с DATE OF ISSUE / BERILGAN SANASI, форматируй DD.MM.YYYY.

Нормализация:

Все даты = DD.MM.YYYY.

Все буквы в именах = UPPERCASE, пробелы нормализованы.

Страны в Issuing Country и Nationality = ISO3 из MRZ.

Если поле не найдено — оставь пустым.

Вывод — одна CSV-строка строго в этом порядке колонок:
Document Type,Issuing Country,Surname,Given Name,Document Number,Nationality,Date of Birth,Sex,Expiry Date,Personal Number,Date of Issue,Place of Birth,Authority,File Name

--- НАЧАЛО ТЕКСТА ---
${fullText}
--- КОНЕЦ ТЕКСТА ---

--- ИМЯ ФАЙЛА ---
${input.fileName}
--- КОНЕЦ ИМЕНИ ФАЙЛА ---
`;

  const gptResponse = await yandexGptService.analyzeText(prompt);
  const mrzData = parseCsvResponse(gptResponse);

  if (!mrzData.documentNumber) {
    throw new Error('Failed to extract a valid Document Number from the text.');
  }

  return { mrzData, rawOcrText: fullText };
}
