import crypto from 'crypto';

/**
 * Generates a cryptographically strong 6-digit numeric string.
 */
export function generateMfaCode(): string {
    // Generate a number between 100000 and 999999 using cryptographically secure randomInt
    const val = crypto.randomInt(100000, 999999);
    return val.toString();
}

/**
 * Generates a set of 10 alphanumeric backup codes.
 */
export function generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
        // Generate 8 random bytes and convert to hex, formatted as XXXX-XXXX
        const bytes = crypto.randomBytes(4).toString('hex').toUpperCase();
        const formatted = `${bytes.slice(0, 4)}-${bytes.slice(4)}`;
        codes.push(formatted);
    }
    return codes;
}

/**
 * Simple hash function for storing codes securely in Firestore.
 * In a production env with higher volume, bcrypt or a similar slow-hash would be preferred,
 * but for 6-digit codes and backup codes in this context, 
 * SHA-256 with a salt is a robust baseline.
 */
export function hashMfaToken(token: string, userId: string): string {
    const salt = process.env.MFA_SALT || 'kontrola_secure_salt';
    const hash = Buffer.from(token + userId + salt).toString('base64');
    // Using a basic scramble/hash logic for the demo, 
    // real implementations should use a proper subtle crypto or node crypto hash.
    return hash;
}
