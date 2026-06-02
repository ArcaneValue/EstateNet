export interface LegalDocumentConfig {
  type: 'privacyPolicy' | 'termsOfService';
  version: string;
  effectiveDate: string;
  url: string;
}

// Current legal document versions.
// Bump version + set effectiveDate 30 days ahead when documents change.
export const LEGAL_DOCUMENTS: LegalDocumentConfig[] = [
  {
    type: 'privacyPolicy',
    version: '1.1',
    effectiveDate: '2026-07-02T00:00:00.000Z',
    url: 'https://arcanevalue.github.io/EstateNet/privacy-policy.html',
  },
  {
    type: 'termsOfService',
    version: '1.1',
    effectiveDate: '2026-07-02T00:00:00.000Z',
    url: 'https://arcanevalue.github.io/EstateNet/terms-of-service.html',
  },
];

export type LegalDocumentType = LegalDocumentConfig['type'];
