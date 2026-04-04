'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It provides a non-blocking user notification instead of crashing the UI.
 */
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // In development, log the full error for easier debugging of Firestore rules.
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Firestore Permission Error] at path: ${error.path}`, error);
      }

      // Display a non-blocking toast notification instead of killing the application session.
      toast({
        variant: 'destructive',
        title: 'Limited Data Access',
        description: `You don't have permission to view some data on this page: ${error.path}. Please contact your administrator if this is unexpected.`,
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
