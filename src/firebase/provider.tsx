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

// Internal state for user authentication and profile
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  profile: UserProfile | null;
  activeProfile: UserProfile | null;
  isProfileLoading: boolean;
  isActiveProfileLoading: boolean;
  activeProfileId: string | null;
  activeAccessLevel: 'owner' | 'editor' | 'viewer';
}

// Combined state for the Firebase context
export interface FirebaseContextState extends UserAuthState {
  areServicesAvailable: boolean; // True if core services (app, firestore, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; // The Auth service instance
  switchProfile: (profileId: string | null, level?: 'owner' | 'editor' | 'viewer') => void;
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser extends FirebaseContextState {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
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
  activeProfile: UserProfile | null;
  isProfileLoading: boolean;
  isActiveProfileLoading: boolean;
  activeProfileId: string | null;
  activeAccessLevel: 'owner' | 'editor' | 'viewer';
  switchProfile: (profileId: string | null, level?: 'owner' | 'editor' | 'viewer') => void;
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
  const [userAuthState, setUserAuthState] = useState<UserAuthState>(() => {
    // Try to restore previous terminal session if it exists
    let savedId = null;
    let savedLevel: any = 'owner';
    if (typeof window !== 'undefined') {
        savedId = localStorage.getItem('kontrola_active_terminal_id');
        savedLevel = localStorage.getItem('kontrola_active_terminal_level') || 'owner';
    }

    return {
        user: null,
        isUserLoading: true,
        userError: null,
        profile: null,
        activeProfile: null,
        isProfileLoading: true,
        isActiveProfileLoading: true,
        activeProfileId: savedId,
        activeAccessLevel: savedLevel,
    };
  });

  const switchProfile = (profileId: string | null, level: 'owner' | 'editor' | 'viewer' = 'owner') => {
    setUserAuthState(prev => ({ 
        ...prev, 
        activeProfileId: profileId, 
        activeAccessLevel: level 
    }));
    
    if (typeof window !== 'undefined') {
        if (profileId) {
            localStorage.setItem('kontrola_active_terminal_id', profileId);
            localStorage.setItem('kontrola_active_terminal_level', level);
        } else {
            localStorage.removeItem('kontrola_active_terminal_id');
            localStorage.removeItem('kontrola_active_terminal_level');
        }
    }
  };

  // Effect for Auth state
  useEffect(() => {
    if (!auth) {
       setUserAuthState(s => ({ ...s, isUserLoading: false, userError: new Error('Auth service not available.')}));
       return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // SECURITY Audit Fix: If user logs out, we MUST clear active business terminal
            if (typeof window !== 'undefined') {
                localStorage.removeItem('kontrola_active_terminal_id');
                localStorage.removeItem('kontrola_active_terminal_level');
            }
            
            setUserAuthState(prevState => ({ 
                ...prevState, 
                user: null, 
                isUserLoading: false,
                activeProfileId: null,
                activeProfile: null,
                activeAccessLevel: 'owner'
            }));
        } else {
            setUserAuthState(prevState => ({ 
                ...prevState, 
                user: user, 
                isUserLoading: false,
                // Default to self-terminal if no restore was found
                activeProfileId: prevState.activeProfileId || user.uid
            }));
        }
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
      const profilePath = `users/${userAuthState.user.uid}/profile/${userAuthState.user.uid}`;
      const profileRef = doc(firestore, profilePath);

      const unsubscribe = onSnapshot(
        profileRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as UserProfile;
            setUserAuthState((prevState) => ({
              ...prevState,
              profile: data,
              isProfileLoading: false,
            }));
          } else {
            // No profile document found. We no longer auto-initialize here.
            setUserAuthState((prevState) => ({
              ...prevState,
              profile: null,
              isProfileLoading: false,
            }));
          }
        },
        (error) => {
          console.error('[Firebase Diagnostics] Error fetching user profile:', error);
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

  // Effect for ACTIVE Profile state (The terminal being viewed)
  useEffect(() => {
    if (!firestore || !userAuthState.activeProfileId) {
        setUserAuthState(s => ({ ...s, activeProfile: null, isActiveProfileLoading: false }));
        return;
    }
    
    setUserAuthState(s => ({ ...s, isActiveProfileLoading: true }));

    const profilePath = `users/${userAuthState.activeProfileId}/profile/${userAuthState.activeProfileId}`;
    const profileRef = doc(firestore, profilePath);

    const unsubscribe = onSnapshot(profileRef, (snap) => {
        if (snap.exists()) {
            setUserAuthState(s => ({ ...s, activeProfile: snap.data() as UserProfile, isActiveProfileLoading: false }));
        } else {
            setUserAuthState(s => ({ ...s, activeProfile: null, isActiveProfileLoading: false }));
        }
    }, (err) => {
        console.error("Error fetching active profile:", err);
        setUserAuthState(s => ({ ...s, activeProfile: null, isActiveProfileLoading: false }));
    });

    return () => unsubscribe();
  }, [userAuthState.activeProfileId, firestore]);

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
      activeProfile: userAuthState.activeProfile,
      isProfileLoading: userAuthState.isProfileLoading,
      isActiveProfileLoading: userAuthState.isActiveProfileLoading,
      activeProfileId: userAuthState.activeProfileId,
      activeAccessLevel: (userAuthState.user && userAuthState.activeProfile?.ownerUid === userAuthState.user.uid) 
        ? 'owner' 
        : userAuthState.activeAccessLevel,
      switchProfile: switchProfile,
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
    ...context,
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
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
    activeProfile: context.activeProfile,
    isProfileLoading: context.isProfileLoading,
    isActiveProfileLoading: context.isActiveProfileLoading,
    activeProfileId: context.activeProfileId,
    activeAccessLevel: context.activeAccessLevel,
    switchProfile: context.switchProfile,
  };
};
