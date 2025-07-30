import type { MrzData } from '@/types';

const sampleSurnames = ['DOE', 'SMITH', 'YILMAZ', 'IVANOV', 'CHEN', 'GARCIA'];
const sampleGivenNames = ['JOHN', 'JANE', 'AHMET', 'OLGA', 'WEI', 'MARIA'];
const countries = ['USA', 'GBR', 'TUR', 'RUS', 'CHN', 'ESP'];
const sex = ['M', 'F'];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(startYear: number, endYear: number): string {
  const year = Math.floor(Math.random() * (endYear - startYear + 1)) + startYear;
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  return `${year.toString().slice(-2)}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
}

function randomString(length: number, chars: string): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateMockMrzData(): MrzData {
  const issuingCountry = randomElement(countries);
  return {
    documentType: 'P',
    issuingCountry: issuingCountry,
    surname: randomElement(sampleSurnames),
    givenName: randomElement(sampleGivenNames),
    documentNumber: `${randomString(1, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')}${randomString(8, '0123456789')}`,
    nationality: issuingCountry,
    dateOfBirth: randomDate(1950, 2005),
    sex: randomElement(sex),
    expiryDate: randomDate(2025, 2035),
    personalNumber: randomString(11, '0123456789'),
  };
}
