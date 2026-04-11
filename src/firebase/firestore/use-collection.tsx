'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Relies on the calling component to memoize the query to prevent re-renders.
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined. The caller is responsible for memoizing this value.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    targetRefOrQuery: CollectionReference<DocumentData> | Query<DocumentData>  | null | undefined,
    collectionPath?: string, // Optional: for more descriptive error reporting
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestorePermissionError | Error | null>(null);

  useEffect(() => {
    if (!targetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    
    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      targetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        let path: string = collectionPath || 'complex_query_path';
        
        // If no explicit path provided, try to extract from a CollectionReference.
        if (!collectionPath && targetRefOrQuery.type === 'collection') {
           path = (targetRefOrQuery as CollectionReference).path;
        }

        // Distinguish between actual permission denied and other errors (like missing indexes)
        if (error.code === 'permission-denied') {
            const contextualError = new FirestorePermissionError({
                operation: 'list',
                path,
            });
            setError(contextualError);
            errorEmitter.emit('permission-error', contextualError);
        } else if (error.code === 'failed-precondition') {
            console.error(`[Firestore Index Error] This query requires a composite index:`, error.message);
            setError(error);
        } else {
            console.error(`[Firestore Error] ${error.code}:`, error.message);
            setError(error);
        }

        setData(null);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [targetRefOrQuery, collectionPath]);

  return { data, isLoading, error };
}
