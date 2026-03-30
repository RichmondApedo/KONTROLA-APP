/**
 * Recursive Sanitization Utility for Kontrola Business Suite.
 * Protects against XSS and ensures data integrity by trimming strings
 * and stripping potentially malicious HTML tags.
 */

export function sanitizeString(val: string): string {
    if (typeof val !== 'string') return val;
    
    // 1. Basic HTML Tag Stripping (Safe for standard text fields)
    const stripped = val.replace(/<[^>]*>?/gm, '');
    
    // 2. Trim excess whitespace
    return stripped.trim();
}

/**
 * Recursively sanitizes an object's string properties.
 */
export function sanitizeObject<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return typeof obj === 'string' ? sanitizeString(obj) as unknown as T : obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item)) as unknown as T;
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            result[key] = sanitizeString(value);
        } else if (typeof value === 'object' && value !== null) {
            result[key] = sanitizeObject(value);
        } else {
            result[key] = value;
        }
    }

    return result as T;
}
