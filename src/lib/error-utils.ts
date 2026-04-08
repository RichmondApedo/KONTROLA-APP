/**
 * Centralized error sanitization for API routes.
 *
 * This utility maps internal errors to safe, user-friendly messages.
 * It prevents sensitive details (API keys, stack traces, internal service info)
 * from being exposed in customer-facing responses.
 */

const SENSITIVE_PATTERNS = [
  /sk_live_[a-zA-Z0-9]+/gi,   // Paystack live secret keys
  /sk_test_[a-zA-Z0-9]+/gi,   // Paystack test secret keys
  /AIza[a-zA-Z0-9_-]{35}/gi,  // Google/Firebase API keys
  /firebase/gi,                // Firebase references
  /firestore/gi,               // Firestore references
  /sql/gi,                     // SQL references
  /database/gi,                // Database references
  /mongodb/gi,                 // MongoDB references
  /stack trace/gi,             // Stack traces
  /at [a-zA-Z0-9_.]+\s+\(/gi,  // JS stack trace fragments
  /node_modules/gi,            // Internal path references
  /file:\/\/\//gi,             // File paths
  /Users\//gi,                 // Local system paths
  /failed to fetch/gi,         // Generic fetch errors that can be technical
  /unexpected token/gi,        // JSON parsing errors
  /config/gi,                  // Configuration references
  /secret/gi,                  // Secret references
  /env/gi,                     // Environment variable references
];

/**
 * Checks if an error message contains sensitive internal information.
 */
function containsSensitiveInfo(message: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Maps well-known error conditions to safe messages.
 */
function mapToSafeMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  // Payment-specific mappings from Paystack
  if (message.toLowerCase().includes('verification failed') || message.toLowerCase().includes('status !== \'success\'')) {
    return 'Your payment could not be verified. Please contact support if you were charged.';
  }
  if (message.toLowerCase().includes('email discrepancy') || message.toLowerCase().includes('does not belong to your account')) {
    return 'This payment does not match your account. Please contact support.';
  }
  if (message.toLowerCase().includes('customer details')) {
    return 'Could not retrieve your payment details. Please try again or contact support.';
  }
  if (message.toLowerCase().includes('missing required')) {
    return 'Your request was incomplete. Please try again.';
  }
  if (message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('invalid token')) {
    return 'Your session has expired. Please sign in again and retry.';
  }
  if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch failed') || message.toLowerCase().includes('econnrefused')) {
    return 'A network error occurred. Please check your connection and try again.';
  }

  // If the message is already a safe, user-facing sentence with no sensitive data, pass it through
  if (!containsSensitiveInfo(message) && message.length < 200) {
    return message;
  }

  // Default fallback for all other cases
  return 'An unexpected error occurred while processing your payment. Please try again or contact support.';
}

/**
 * Returns a sanitized, customer-safe error message.
 * Logs the original error internally.
 *
 * @param error - The original caught error
 * @param context - Optional label logged with the error for debugging
 * @returns A safe string suitable for sending to the client
 */
export function getSafeErrorMessage(error: unknown, context?: string): string {
  const originalMessage = error instanceof Error ? error.message : String(error);

  // Always log the full error server-side for debugging
  console.error(`[${context || 'API Error'}] Internal Error:`, originalMessage, error instanceof Error ? error.stack : '');

  return mapToSafeMessage(error);
}
