
/**
 * Security Configuration for KONTROLA-APP
 * Centralizes administrative privileges and sensitive checks.
 */

export const SECURITY_CONFIG = {
    // The master admin email for "break-glass" recovery and super-admin access.
    // In production, this can be overridden by NEXT_PUBLIC_SUPER_ADMIN_EMAIL.
    SUPER_ADMIN_EMAIL: process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || 'richmondapedo549@gmail.com',
    
    // Roles allowed to access the Admin Panel
    ADMIN_ROLES: ['admin'],
    
    // Roles allowed to perform data audits
    AUDITOR_ROLES: ['admin', 'auditor'],
};

/**
 * Helper to check if a user profile has administrative privileges.
 */
export function checkIsAdmin(profile: any, user: any): boolean {
    if (!user) return false;
    
    // Check super-admin email
    if (user.email === SECURITY_CONFIG.SUPER_ADMIN_EMAIL) return true;
    
    // Check role in profile
    return profile?.role === 'admin';
}
