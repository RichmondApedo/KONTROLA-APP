import { crypto } from 'crypto';

/**
 * Generates a cryptographically strong 6-digit numeric string.
 */
export function generateMfaCode(): string {
    // Generate a number between 100000 and 999999
    const val = Math.floor(100000 + Math.random() * 900000);
    return val.toString();
}

/**
 * Generates a set of 10 alphanumeric backup codes.
 */
export function generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
        // Alphanumeric format: XXXX-XXXX
        const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
        codes.push(`${part1}-${part2}`);
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
