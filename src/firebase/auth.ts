'use client';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  initializeAuth,
  indexedDBLocalPersistence,
  User,
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
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
      rawId: attestation.rawId,
      response: {
        clientDataJSON: attestation.response.clientDataJSON,
        attestationObject: attestation.response.attestationObject,
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

export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
};


export async function signOut(auth: Auth) {
  try {
    // SECURITY Audit Fix: Clear session markers from localStorage on signout
    // This prevents the next user on this browser from being shown the 
    // previous user's active business terminal ID.
    if (typeof window !== 'undefined') {
        localStorage.removeItem('kontrola_active_terminal_id');
        localStorage.removeItem('kontrola_active_terminal_level');
    }
    
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out: ', error);
    throw error;
  }
}
