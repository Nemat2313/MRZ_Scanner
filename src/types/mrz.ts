import {z} from 'zod';

/**
 * @fileOverview Schemas and types for MRZ data extraction.
 */

// Define the schema for the input, which is a data URI of the photo
export const ExtractMrzDataInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a passport or ID card, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
});
export type ExtractMrzDataInput = z.infer<typeof ExtractMrzDataInputSchema>;

// Define the schema for the output data, matching the MrzData type
export const MrzDataSchema = z.object({
  documentType: z.string().describe("Document Type (e.g., 'P' for Passport)"),
  issuingCountry: z
    .string()
    .describe('Issuing Country or Organization (3-letter code, e.g., "USA")'),
  surname: z.string().describe('The full surname(s) of the holder.'),
  givenName: z.string().describe('The full given name(s) of the holder.'),
  documentNumber: z.string().describe('The passport or ID card number.'),
  nationality: z.string().describe('Nationality of the holder (3-letter code)'),
  dateOfBirth: z
    .string()
    .describe(
      'Date of birth of the holder, formatted as DD.MM.YYYY. For example, "25.08.1985"'
    ),
  sex: z.string().describe('Sex of the holder ("M", "F", or "X")'),
  expiryDate: z
    .string()
    .describe(
      'Expiration date of the document, formatted as DD.MM.YYYY. For example, "25.08.2030"'
    ),
  personalNumber: z
    .string()
    .optional()
    .describe('Optional personal number or national identification number.'),
  dateOfIssue: z
    .string()
    .optional()
    .describe(
      'The date the document was issued, formatted as DD.MM.YYYY. For example, "25.08.2020"'
    ),
  placeOfBirth: z
    .string()
    .optional()
    .describe('The place of birth of the holder.'),
  authority: z
    .string()
    .optional()
    .describe('The authority that issued the document.'),
});
export type MrzData = z.infer<typeof MrzDataSchema>;
