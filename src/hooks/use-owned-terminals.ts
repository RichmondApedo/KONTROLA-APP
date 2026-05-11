'use client';

import { useMemo } from 'react';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { BusinessAccess } from '@/lib/types';

export function useOwnedTerminals() {
    const { user } = useUser();
    const firestore = useFirestore();

    const ownedTerminalsQuery = useMemo(() => 
        user && firestore ? query(
            collection(firestore, 'business_access_grants'), 
            where('targetEmail', '==', user?.email?.toLowerCase()),
            where('accessLevel', '==', 'owner')
        ) : null,
        [user, firestore]
    );

    const { data: ownedTerminals, isLoading } = useCollection<BusinessAccess>(ownedTerminalsQuery);

    return {
        ownedTerminals,
        isLoading,
        hasOtherTerminals: ownedTerminals && ownedTerminals.length > 0
    };
}
