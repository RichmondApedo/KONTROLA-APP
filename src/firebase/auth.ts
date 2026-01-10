'use client';
import {
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithRedirect,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendSignInLinkToEmail,
  signOut as firebaseSignOut,
  browserLocalPersistence,
  browserSessionPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth';
import {
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';

// Helper function to convert buffer to base64url
function bufferToBase64URL(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Helper function to convert base64url to buffer
function base64URLToBuffer(base64URL: string): ArrayBuffer {
    const base64 = base64URL.replace(/-/g, '+').replace(/_/g, '/');
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

export async function createPasskey(auth: Auth) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  // 1. Get challenge from a secure backend
  // For this prototype, we'll generate a dummy one on the client
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const options = {
    challenge,
    rp: { name: 'KONTROLA', id: window.location.hostname },
    user: {
      id: new TextEncoder().encode(user.uid),
      name: user.email || 'user',
      displayName: user.displayName || 'User',
    },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'required',
    },
    timeout: 60000,
    attestation: 'direct',
  };

  try {
    const attestation = await startRegistration(options as any);
    
    // 2. Send attestation to a secure backend for verification and storage
    // In a real app, you would send this to your server
    console.log('Passkey registration successful:', {
      id: attestation.id,
      rawId: bufferToBase64URL(attestation.rawId),
      response: {
        clientDataJSON: bufferToBase64URL(attestation.response.clientDataJSON),
        attestationObject: bufferToBase64URL(attestation.response.attestationObject),
      },
    });

  } catch (error) {
    console.error('Passkey registration failed:', error);
    throw new Error('Could not create passkey.');
  }
}

export async function signInWithPasskey(auth: Auth) {
    // 1. Get challenge from a secure backend
    // For this prototype, we'll generate a dummy one on the client
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    try {
        const options = {
            challenge,
            rpId: window.location.hostname,
            userVerification: 'required',
            timeout: 60000,
        };

        const assertion = await startAuthentication(options as any);

        // 2. Send assertion to backend for verification
        // This would involve a custom sign-in process with Firebase
        console.log('Passkey authentication successful:', {
          id: assertion.id,
          rawId: bufferToBase64URL(assertion.rawId),
          response: {
            clientDataJSON: bufferToBase64URL(assertion.response.clientDataJSON),
            authenticatorData: bufferToBase64URL(assertion.response.authenticatorData),
            signature: bufferToBase64URL(assertion.response.signature),
            userHandle: assertion.response.userHandle ? bufferToBase64URL(assertion.response.userHandle) : null,
          },
        });
        
        // As we don't have a backend to verify the assertion and create a custom token,
        // we can't truly sign in. We'll simulate a success.
        // In a real app, the server would return a custom Firebase token.
        // And you would use `signInWithCustomToken(auth, customToken)`
        
        // For now, this is a placeholder.
        if (auth.currentUser) {
            return auth.currentUser;
        } else {
           throw new Error("Simulated sign-in failed as no user is currently signed in to associate the passkey with.");
        }


    } catch (error) {
        console.error('Passkey sign-in failed:', error);
        throw new Error('Passkey sign-in failed. Please try another method.');
    }
}


export async function signInWithGoogle(auth: Auth) {
  const provider = new GoogleAuthProvider();
  try {
    await auth.setPersistence(browserLocalPersistence);
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google: ', error);
    throw error;
  }
}

export async function signUpWithEmail(auth: Auth, email: string, pass: string) {
  try {
    await auth.setPersistence(browserLocalPersistence);
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      pass
    );
    return userCredential.user;
  } catch (error) {
    console.error('Error signing up with email and password: ', error);
    throw error;
  }
}

export async function signInWithEmail(auth: Auth, email: string, pass: string) {
  try {
    await auth.setPersistence(browserLocalPersistence);
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in with email and password: ', error);
    throw error;
  }
}

export async function signOut(auth: Auth) {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out: ', error);
    throw error;
  }
}
