/**
 * @fileOverview A high-performance server-side utility to scan and sanitize user-provided text inputs
 * against prompt injection, jailbreaking, and system instruction hijacking.
 */

// Suspicious patterns and signatures common in LLM prompt injection and jailbreak payloads
const SUSPICIOUS_PATTERNS = [
  /ignore\s+(?:the\s+)?(?:above|previous|initial|system|underlying)/i,
  /disregard\s+(?:the\s+)?(?:above|previous|initial|system|underlying)/i,
  /override\s+(?:the\s+)?(?:above|previous|initial|system|underlying)/i,
  /bypass\s+(?:the\s+)?(?:above|previous|initial|system|underlying)/i,
  /forget\s+(?:the\s+)?(?:above|previous|initial|system|underlying)/i,
  /you\s+are\s+now\s+(?:a|an|admin|developer|jailbroken|system)/i,
  /act\s+as\s+(?:a|an|admin|developer|jailbroken|system)/i,
  /system\s+prompt/i,
  /developer\s+mode/i,
  /output\s+(?:your\s+)?system/i,
  /print\s+(?:your\s+)?prompt/i,
  /reveal\s+(?:your\s+)?instructions/i,
  /under\s+no\s+circumstances\s+should\s+you/i,
  /new\s+rule/i,
  /do\s+not\s+warn/i,
];

/**
 * Validates and sanitizes a user query.
 * Throws a Security Exception if prompt injection is suspected.
 * 
 * @param input The raw user free-form query or message.
 * @returns The sanitized input string if safe.
 * @throws Error if potential prompt injection is detected.
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  const trimmedInput = input.trim();

  // 1. Scan for jailbreak signatures and prompt injection patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(trimmedInput)) {
      console.warn(`[AI Security Shield] BLOCKED: Prompt injection signature matched: ${pattern.toString()}`);
      throw new Error("Security Alert: Suspicious query pattern detected. The action has been blocked for data safety.");
    }
  }

  // 2. Perform general sanitization (escaping HTML-like brackets to prevent markdown/HTML prompt interpolation issues)
  const sanitized = trimmedInput
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/[{}]/g, ''); // Strip braces to prevent template injection issues in Handlebars/Gemini templates

  return sanitized;
}
