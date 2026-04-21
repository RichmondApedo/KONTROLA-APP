'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { reportError } from '@/lib/sentinel';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It provides a non-blocking user notification and reports the context to Sentinel.
 */
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // 1. Report to cloud monitoring for developer review
      reportError(error, undefined, { 
        type: 'PERMISSION_DENIED', 
        path: error.request.path 
      });

      // 2. In development, log the full error for easier debugging of Firestore rules.
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Firestore Permission Error] at path: ${error.request.path}`, error);
      }

      // 3. Display a non-blocking toast notification
      toast({
        variant: 'destructive',
        title: 'Limited Data Access',
        description: `You don't have permission to view some data on this page: ${error.request.path}. please contact your administrator if this is unexpected.`,
      });
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  // This component renders nothing and no longer throws errors globally.
  return null;
}
