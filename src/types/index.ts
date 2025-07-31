export type ScanStatus = 'processing' | 'success' | 'error';

export interface MrzData {
  documentType: string;
  issuingCountry: string;
  surname: string;
  givenName: string;
  documentNumber: string;
  nationality: string;
  dateOfBirth: string;
  sex: string;
  expiryDate: string;
  personalNumber: string;
  dateOfIssue?: string;
  placeOfBirth?: string;
  authority?: string;
  [key: string]: string | undefined;
}

export interface ScanResult {
  id: string;
  fileName: string;
  originalImage: string;
  enhancedImage?: string;
  status: ScanStatus;
  mrzData?: MrzData;
  error?: string;
}

export type Language = 'en' | 'tr' | 'ru';
