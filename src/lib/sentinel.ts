import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase/init';

interface ErrorReport {
  message: string;
  stack?: string;
  path: string;
  userId?: string;
  metadata?: Record<string, any>;
  timestamp: any;
  userAgent: string;
}

/**
 * Sentinel: The internal error monitoring system for KONTROLA.
 * Captures and logs runtime errors to Firestore for forensic analysis.
 * This is the client-side counterpart to the server-side audit logger.
 */
export async function reportError(error: Error | string, userId?: string, metadata?: Record<string, any>) {
  try {
    const { firestore } = initializeFirebase();
    
    const errorLog: ErrorReport = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      path: typeof window !== 'undefined' ? window.location.pathname : 'server',
      userId,
      metadata,
      timestamp: serverTimestamp(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
    };

    // Store in a dedicated collection for developer review
    await addDoc(collection(firestore, 'system_errors'), errorLog);
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Sentinel] Diagnostic sent to cloud:', errorLog);
    }
  } catch (err) {
    // Fail silently in production to avoid infinite error loops
    console.error('[Sentinel Critical Failure] Could not report error:', err);
  }
}
