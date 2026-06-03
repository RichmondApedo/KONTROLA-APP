/**
 * @fileOverview A high-performance server-side utility to scrub Personally Identifiable Information (PII)
 * from transaction narrations, ledger descriptions, and chat logs before sending them to external AI endpoints.
 */

// Common financial entities/keywords in Ghana that should NOT be scrubbed as personal names
const EXCLUDED_ENTITIES = new Set([
  'ecg', 'gwcl', 'mtn', 'telecel', 'airteltigo', 'vodafone', 'dstv', 'gotv', 'startimes', 'kontrola', 'mono', 'paystack'
]);

/**
 * Scrubs email addresses, phone numbers, credit cards, and common transactor name patterns.
 * 
 * @param text The input narration or string to be scrubbed.
 * @returns The scrubbed string safe for AI consumption.
 */
export function scrubPII(text: string): string {
  if (!text) return '';

  let scrubbed = text;

  // 1. Scrub Email Addresses
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  scrubbed = scrubbed.replace(emailRegex, '[EMAIL]');

  // 2. Scrub Standard and Ghana Mobile Numbers (e.g. +233244123456, 0501234567, 233 24 412 3456)
  // Standard format matches +233, 233, or 0 followed by 9 digits with optional spaces or hyphens.
  const phoneRegex = /(?:\+?233|0)[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d[\s-]?\d\b/g;
  scrubbed = scrubbed.replace(phoneRegex, '[PHONE]');

  // 3. Scrub Credit / Debit / Mobile Money Account Card Numbers (12 to 19 digits)
  const cardRegex = /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4,7}\b/g;
  scrubbed = scrubbed.replace(cardRegex, '[CARD_NUMBER]');

  // 4. Scrub Transaction Reference and MoMo Reference IDs (usually 8-20 alphanumeric characters, often all caps or numbers)
  // Let's target strings like "Ref: 123456789" or alphanumeric tokens that aren't common financial terms
  const refPrefixRegex = /(?:ref|reference|txid|transaction id|txn|id)[:\s]+([A-Za-z0-9-]{8,24})\b/gi;
  scrubbed = scrubbed.replace(refPrefixRegex, (match, refId) => {
    return match.replace(refId, '[REF_ID]');
  });

  // 5. Scrub Transactor Names following common Mobile Money (MoMo) / bank transfer phrases
  // E.g., "Transfer from John Doe", "Momo to Richmond Apedo", "Received from Abena Serwaa"
  const namePattern = /(?:transfer from|transfer to|momo from|momo to|cash out to|payment to|payment from|received from|sent to|paid to)\s+([A-Za-z]+(?:\s+[A-Za-z]+){1,3})/gi;
  scrubbed = scrubbed.replace(namePattern, (match, rawName) => {
    const trimmedName = rawName.trim();
    // Check if the captured name is one of our excluded non-person entities
    const isExcluded = trimmedName.split(/\s+/).some((word: string) => EXCLUDED_ENTITIES.has(word.toLowerCase()));
    if (isExcluded) {
      return match; // Return unchanged
    }
    return match.replace(rawName, ' [NAME]');
  });

  // 6. Double Check any lonely numeric sequences that look like phone numbers or MoMo IDs (e.g. 10+ digits)
  const lonelyIdRegex = /\b\d{10,16}\b/g;
  scrubbed = scrubbed.replace(lonelyIdRegex, '[ID]');

  return scrubbed;
}
