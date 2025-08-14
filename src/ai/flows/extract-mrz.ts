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

1. MRZ правила

Определение MRZ: наличие множества символов <. Для паспортов (TD3) — 2 строки по 44 символа.

Document Type = первый символ первой строки (обычно P).

Issuing Country = позиции 3–5 первой строки (ISO3, напр. UZB).

Surname = из первой строки после P<XXX и до << (в UPPERCASE).

Given Name = всё, что после <<, включая все имена и отчества (заменяй < на пробел, удаляй лишние пробелы, UPPERCASE).

Document Number = начало второй строки (поз. 1–9) до контрольной цифры.

Nationality = ISO3 после номера и его чека.

Date of Birth = YYMMDD (позиции 14–19 второй строки) → всегда формат DD.MM.YYYY. Век определяй логично:

Если YY > текущего года → 1900+YY

Если YY ≤ текущего года → 2000+YY
(Пример: 19971212 → 12.12.1997, 050105 → 05.01.2005)

Sex = M или F.

Expiry Date = YYMMDD → всегда DD.MM.YYYY.

Personal Number = из MRZ после даты окончания и её контрольной цифры до финального чека. Только буквы/цифры, без <. Для стран указывай длину:

Узбекистан (UZB) — 14 цифр

Азербайджан (AZE) — 14 цифр

Россия (RUS) — 14 цифр (цифры и иногда буквы)

Киргизстан (KGZ) — 14 цифр

Казахстан (KAZ) — 12 цифр

Таджикистан (TJK) — 14 цифр

Турция (TUR) — 11 цифр (TC Kimlik No)
Если MRZ содержит меньше символов — дополни, исправив OCR-ошибки (O↔0, I↔1, B↔8, S↔5, Z↔2, кириллические М/А/В → латиница M/A/B).

2. Данные вне MRZ

Place of Birth: ищи рядом с PLACE OF BIRTH / TUG\'ILGAN JOYI. Исправляй обрезанные названия (например, RUSSIAN FEDE → RUSSIAN FEDERATION).

Authority: для паспортов Узбекистана — строка, начинающаяся на MIA/МИА и цифры (например, MIA 6206).

Date of Issue: ищи рядом с DATE OF ISSUE / BERILGAN SANASI, формат всегда DD.MM.YYYY, даже если OCR даёт 05 07 2025 или 200507.

3. Нормализация

Все даты = DD.MM.YYYY (не зависимо от формата в исходном тексте).

Все имена и фамилии в UPPERCASE, пробелы нормализованы.

Страны в Issuing Country и Nationality всегда ISO3 из MRZ.

Если поле не найдено — оставь пустым.

4. Вывод

Выводи одну CSV-строку строго в этом порядке колонок:
Document Type,Issuing Country,Surname,Given Name,Document Number,Nationality,Date of Birth,Sex,Expiry Date,Personal Number,Date of Issue,Place of Birth,Authority,File Name

Теперь обработай следующий ввод и верни ОДНУ CSV-СТРОКУ:

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
