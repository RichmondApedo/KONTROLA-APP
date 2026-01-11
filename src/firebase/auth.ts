'use client';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  initializeAuth,
  indexedDBLocalPersistence,
  User,
} from 'firebase/auth';
import {
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import { getApp } from 'firebase/app';

// Helper function to convert buffer to base64url
function bufferToBase64URL(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Helper function toconvert base64url to buffer
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

  const rpId = window.location.hostname;

  const options = {
    challenge,
    rp: { name: 'KONTROLA', id: rpId },
    user: {
      id: new TextEncoder().encode(user.uid),
      name: user.email!,
      displayName: user.displayName || user.email!,
    },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 /* ES256 */ }],
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
    // For a real app, this is where you would send the attestation to your server
    // to verify it and store the public key.
    console.log('Passkey registration successful:', {
      id: attestation.id,
      rawId: bufferToBase64URL(attestation.rawId),
      response: {
        clientDataJSON: bufferToBase64URL(attestation.response.clientDataJSON),
        attestationObject: bufferToBase64URL(attestation.response.attestationObject),
      },
    });
    // For this demo, we'll store the credential ID in local storage as a flag
    // In a real app, your backend would store the credential information linked to the user.
    const passkeyCredentials = JSON.parse(localStorage.getItem('passkeyCredentials') || '{}');
    passkeyCredentials[user.uid] = attestation.id;
    localStorage.setItem('passkeyCredentials', JSON.stringify(passkeyCredentials));

  } catch (error) {
    console.error('Passkey registration failed:', error);
    if (error instanceof Error && error.name === 'InvalidStateError') {
      throw new Error('A passkey for this device has already been created.');
    }
    throw new Error('Could not create passkey.');
  }
}

export async function signInWithPasskey(auth: Auth) {
    // 1. Get challenge from a secure backend
    // For this prototype, we'll generate a dummy one on the client
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    try {
        const rpId = window.location.hostname;
        
        // In a real app, you would fetch the credential IDs from your server for the user.
        // For this demo, we check local storage. This is NOT secure for a real app.
        const passkeyCredentials = JSON.parse(localStorage.getItem('passkeyCredentials') || '{}');
        
        const options = {
            challenge,
            rpId: rpId,
            userVerification: 'required',
            timeout: 60000,
        };

        const assertion = await startAuthentication(options as any);

        // 2. Send assertion to backend for verification
        // This would involve a custom sign-in process with Firebase.
        console.log('Passkey authentication successful:', {
          id: assertion.id,
          rawId: bufferToBase64URL(assertion.rawId),
          response: {
            clientDataJSON: bufferToBase64URL(assertion.response.clientDataJSON),
            authenticatorData: bufferToBase64URL(assertion.response.authenticatorData),
            signature: bufferToBase64URL(assertion.response.signature),
            userHandle: assertion.response.userHandle ? new TextDecoder().decode(assertion.response.userHandle) : null,
          },
        });

        // This is a CRITICAL simplification for the prototype.
        // In a real application, you would:
        // 1. Send the `assertion` object to your backend.
        // 2. Your backend would verify the signature against the public key stored during registration.
        // 3. If valid, your backend would mint a custom Firebase auth token using the Firebase Admin SDK.
        // 4. Your backend sends this custom token back to the client.
        // 5. The client calls `signInWithCustomToken(auth, customToken)`.
        
        const userHandle = assertion.response.userHandle ? new TextDecoder().decode(assertion.response.userHandle) : null;
        
        if (userHandle && passkeyCredentials[userHandle] === assertion.id) {
             // This is a mock verification.
             // We can't actually sign in without a backend, so we check if a user is already
             // signed in, which is not useful for a real login flow, but confirms the passkey was found.
             if (auth.currentUser && auth.currentUser.uid === userHandle) {
                 return auth.currentUser;
             }
             // Since we can't do a custom token sign-in, we throw an error that explains this limitation.
             throw new Error("Passkey verified locally, but prototype cannot complete sign-in without a backend.");
        } else {
            throw new Error("Passkey not recognized for any user.");
        }


    } catch (error) {
        console.error('Passkey sign-in failed:', error);
        throw new Error('Passkey sign-in failed. Please try another method.');
    }
}

export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
};


export async function signOut(auth: Auth) {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out: ', error);
    throw error;
  }
}

    