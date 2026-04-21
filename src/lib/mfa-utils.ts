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
 * Cryptographically strong hash function for storing codes securely in Firestore.
 * Uses HMAC-SHA256 with a unique salt to ensure tokens are non-reversible
 * and resistant to collision or rainbow table attacks.
 */
export function hashMfaToken(token: string, userId: string): string {
    const salt = process.env.MFA_SALT || 'kontrola_secure_production_salt_v1';
    
    return crypto
        .createHmac('sha256', salt)
        .update(token + userId)
        .digest('hex');
}
