'use client';

import React, {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useState,
  useEffect,
} from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import type { UserProfile } from '@/lib/types';
import { setDocumentNonBlocking } from './non-blocking-updates';

// Internal state for user authentication and profile
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  profile: UserProfile | null;
  isProfileLoading: boolean;
}

// Combined state for the Firebase context
export interface FirebaseContextState extends UserAuthState {
  areServicesAvailable: boolean; // True if core services (app, firestore, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; // The Auth service instance
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  profile: UserProfile | null;
  isProfileLoading: boolean;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Return type for useUserProfile() - specific to Firestore profile state
export interface UserProfileHookResult {
  profile: UserProfile | null;
  isProfileLoading: boolean;
}


// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(
  undefined
);

// Props for the provider component
interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true, // Start loading until first auth event
    userError: null,
    profile: null,
    isProfileLoading: true, // Start loading until user is resolved
  });

  // Effect for Auth state
  useEffect(() => {
    if (!auth) {
       setUserAuthState(s => ({ ...s, isUserLoading: false, userError: new Error('Auth service not available.')}));
       return;
    }
    const unsubscribe = onAuthStateChanged(auth, user => {
        setUserAuthState(prevState => ({ ...prevState, user: user, isUserLoading: false }));
    }, error => {
        setUserAuthState(prevState => ({ ...prevState, user: null, isUserLoading: false, userError: error }));
    });
    return () => unsubscribe();
  }, [auth]);
  
  // Effect for Profile state, dependent on user authentication state
  useEffect(() => {
    if (!firestore) {
      setUserAuthState((s) => ({
        ...s,
        isProfileLoading: false,
        userError: new Error('Firestore service not available.'),
      }));
      return;
    }
    // Don't do anything until the initial auth check is complete
    if (userAuthState.isUserLoading) return;

    if (userAuthState.user) {
      // User is logged in, listen for their profile
      const profileRef = doc(
        firestore,
        `users/${userAuthState.user.uid}/profile/${userAuthState.user.uid}`
      );

      const unsubscribe = onSnapshot(
        profileRef,
        (snapshot) => {
          if (snapshot.exists()) {
            // Profile exists, update state with the latest data from the server.
            setUserAuthState((prevState) => ({
              ...prevState,
              profile: snapshot.data() as UserProfile,
              isProfileLoading: false,
            }));
          } else {
            // Profile doesn't exist, so this is a first-time sign-in.
            // We will create a default profile for the user.
            const user = userAuthState.user!;
            const [firstName, ...lastNameParts] = (user.displayName || '').split(' ');

            const newProfile: UserProfile = {
              id: user.uid,
              email: user.email,
              phone: user.phoneNumber,
              firstName: firstName || '',
              lastName: lastNameParts.join(' ') || '',
              preferredCurrency: 'ghs',
              preferredLanguage: 'en',
              plan: 'free',
              role: 'user',
              subscriptionStatus: 'inactive',
              notificationsEnabled: false,
            };

            // Use setDoc to create the document. This is idempotent.
            setDocumentNonBlocking(profileRef, newProfile, { merge: false });
            // After creation, onSnapshot will trigger again with the new document,
            // which will then update the state in the `snapshot.exists()` block.
          }
        },
        (error) => {
          console.error('FirebaseProvider: Error fetching user profile.', error);
          setUserAuthState((s) => ({
            ...s,
            profile: null,
            isProfileLoading: false,
            userError: error,
          }));
        }
      );
      return () => unsubscribe();
    } else {
      // No user is logged in, so clear profile state
      setUserAuthState((s) => ({ ...s, profile: null, isProfileLoading: false }));
    }
  }, [userAuthState.user, userAuthState.isUserLoading, firestore]);

  // Memoize the context value
  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(
      firebaseApp &&
      firestore &&
      auth
    );
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
      profile: userAuthState.profile,
      isProfileLoading: userAuthState.isProfileLoading,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if core services are not available or used outside provider.
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (
    !context.areServicesAvailable ||
    !context.firebaseApp ||
    !context.firestore ||
    !context.auth
  ) {
    throw new Error(
      'Firebase core services not available. Check FirebaseProvider props.'
    );
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
    profile: context.profile,
    isProfileLoading: context.isProfileLoading,
  };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth | null => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a FirebaseProvider.');
  }
  return context.auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore | null => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirestore must be used within a FirebaseProvider.');
  }
  return context.firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp | null => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebaseApp must be used within a FirebaseProvider.');
  }
  return context.firebaseApp;
};

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a FirebaseProvider.');
  }
  return {
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

/** Hook specifically for accessing the Firestore user profile document. */
export const useUserProfile = (): UserProfileHookResult => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a FirebaseProvider.');
  }
  return {
    profile: context.profile,
    isProfileLoading: context.isProfileLoading,
  };
};
