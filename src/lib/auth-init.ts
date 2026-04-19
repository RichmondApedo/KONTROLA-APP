import { Firestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from './types';

/**
 * Ensures that a Firestore profile document exists for the given user.
 * If the profile does not exist, it creates a default one.
 * 
 * @param user The Firebase Auth user object
 * @param firestore The Firestore instance
 * @returns The profile data (either existing or newly created)
 */
export async function ensureUserProfile(user: any, firestore: Firestore): Promise<UserProfile> {
  const profileRef = doc(firestore, 'users', user.uid, 'profile', user.uid);
  
  try {
    const snap = await getDoc(profileRef);
    
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }

    // Profile doesn't exist, create default
    console.log(`[AuthInit] No profile found for ${user.uid}. Initializing default profile...`);
    
    // Attempt to split name from provider data or email
    const displayName = user.displayName || '';
    const nameParts = displayName.split(' ');
    const firstName = nameParts[0] || (user.email ? user.email.split('@')[0] : 'User');
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    const newProfile: UserProfile = {
      id: user.uid,
      email: user.email,
      firstName: firstName,
      lastName: lastName,
      preferredCurrency: 'ghs', // Default for Ghanaian SMEs
      preferredLanguage: 'en',
      plan: 'free',
      role: 'user',
      subscriptionStatus: 'inactive',
      ownerUid: user.uid,
      createdAt: new Date() as any, // Cast to any to satisfy Firestore/Local Date mismatch in types
    };

    // Use setDoc with merge: false (overwrite) because we've confirmed it doesn't exist
    // and we want a clean initialization.
    await setDoc(profileRef, {
        ...newProfile,
        createdAt: serverTimestamp() // Use server timestamp for precision
    });

    return newProfile;
  } catch (error) {
    console.error('[AuthInit] Failed to ensure user profile:', error);
    throw error;
  }
}
