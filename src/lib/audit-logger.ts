import { initializeFirebase } from '@/firebase/server';
import * as admin from 'firebase-admin';

export type AuditAction = 
  | 'PAYMENT_VERIFIED' 
  | 'PAYMENT_VERIFIED_VIA_WEBHOOK' 
  | 'DOWNGRADE_VIA_WEBHOOK' 
  | 'SUBSCRIPTION_CANCELLED' 
  | 'PROFILE_UPDATED' 
  | 'EXPENSE_DELETED' 
  | 'BILL_DELETED' 
  | 'MFA_ENROLLED'
  | 'MFA_BACKUP_CODES_GENERATED'
  | 'MFA_ENABLED'
  | 'MFA_DISABLED'
  | 'SECURITY_ALERT';

interface AuditLog {
  userId: string;
  action: AuditAction;
  resourceId?: string;
  metadata?: Record<string, any>;
  timestamp: admin.firestore.Timestamp | Date;
  ipAddress?: string;
}

/**
 * Log a high-stakes action to the secure audit_logs collection.
 * This collection is immutable via security rules to ensure forensic integrity.
 */
export async function logAuditAction(params: Omit<AuditLog, 'timestamp' | 'userId'>, userId: string) {
  const { firestore } = initializeFirebase();
  if (!firestore) return;

  try {
    const auditLog: AuditLog = {
      ...params,
      userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp() as any,
    };

    await firestore.collection('audit_logs').add(auditLog);
    console.log(`[Audit] Action logged: ${params.action} for user ${userId}`);
  } catch (error) {
    console.error('[Audit Error] Failed to write audit log:', error);
  }
}
