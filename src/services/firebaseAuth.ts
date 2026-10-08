import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  type Auth,
  type User as FirebaseUser,
  type ConfirmationResult,
} from 'firebase/auth';

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let isFirebaseConfigured = false;
let configChecked = false;

// In-memory simulation fallback when FIREBASE_CONFIG is not yet provided in secrets
interface InMemoryUser {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
}

let inMemoryCurrentUser: InMemoryUser | null = null;
const authStateListeners: Array<(user: FirebaseUser | InMemoryUser | null) => void> = [];

export interface FirebaseConfigShape {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export async function initFirebase(): Promise<{ isConfigured: boolean; auth: Auth | null }> {
  if (configChecked && firebaseAuth) {
    return { isConfigured: isFirebaseConfigured, auth: firebaseAuth };
  }

  let config: FirebaseConfigShape | null = null;

  // 1. Try client Vite environment variable
  const viteConfig = (import.meta as any).env?.VITE_FIREBASE_CONFIG;
  if (viteConfig) {
    try {
      config = typeof viteConfig === 'string' ? JSON.parse(viteConfig) : (viteConfig as FirebaseConfigShape);
    } catch {
      console.warn('[firebaseAuth] Could not parse VITE_FIREBASE_CONFIG');
    }
  }

  // 2. Try fetching from server API which reads process.env.FIREBASE_CONFIG
  if (!config) {
    try {
      const res = await fetch('/api/auth/config');
      if (res.ok) {
        const data = await res.json();
        if (data?.configured && data?.config?.apiKey) {
          config = data.config;
        }
      }
    } catch {
      // Backend check failed or not ready
    }
  }

  if (config && config.apiKey && config.projectId) {
    try {
      if (getApps().length === 0) {
        firebaseApp = initializeApp(config);
      } else {
        firebaseApp = getApp();
      }
      firebaseAuth = getAuth(firebaseApp);
      isFirebaseConfigured = true;
      console.log('[firebaseAuth] Real Firebase Auth initialized with project:', config.projectId);
    } catch (err) {
      console.error('[firebaseAuth] Initialization error:', err);
      isFirebaseConfigured = false;
    }
  } else {
    console.info('[firebaseAuth] Running with in-memory auth provider (FIREBASE_CONFIG not set in secrets yet)');
    isFirebaseConfigured = false;
  }

  configChecked = true;
  return { isConfigured: isFirebaseConfigured, auth: firebaseAuth };
}

export function isFirebaseReady(): boolean {
  return isFirebaseConfigured;
}

export function subscribeAuthState(callback: (user: FirebaseUser | InMemoryUser | null) => void): () => void {
  authStateListeners.push(callback);

  if (firebaseAuth) {
    return fbOnAuthStateChanged(firebaseAuth, (user) => {
      callback(user);
    });
  }

  // Immediately notify with in-memory state
  callback(inMemoryCurrentUser);

  return () => {
    const idx = authStateListeners.indexOf(callback);
    if (idx !== -1) authStateListeners.splice(idx, 1);
  };
}

function notifyInMemoryListeners() {
  for (const listener of authStateListeners) {
    listener(inMemoryCurrentUser);
  }
}

// Email Auth
export async function signInEmail(email: string, pass: string) {
  await initFirebase();
  if (isFirebaseConfigured && firebaseAuth) {
    const cred = await signInWithEmailAndPassword(firebaseAuth, email, pass);
    return cred.user;
  } else {
    // In-memory authentication (simulated Firebase Auth without localStorage)
    const namePart = email.split('@')[0];
    inMemoryCurrentUser = {
      uid: `mem_${Date.now()}`,
      email,
      phoneNumber: null,
      displayName: namePart.charAt(0).toUpperCase() + namePart.slice(1),
    };
    notifyInMemoryListeners();
    return inMemoryCurrentUser;
  }
}

export async function signUpEmail(email: string, pass: string, displayName?: string) {
  await initFirebase();
  if (isFirebaseConfigured && firebaseAuth) {
    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, pass);
    return cred.user;
  } else {
    inMemoryCurrentUser = {
      uid: `mem_${Date.now()}`,
      email,
      phoneNumber: null,
      displayName: displayName || email.split('@')[0],
    };
    notifyInMemoryListeners();
    return inMemoryCurrentUser;
  }
}

// Mobile OTP Auth
let confirmationResultRef: ConfirmationResult | null = null;
let inMemoryOtpCode = '123456';

export async function setupPhoneRecaptcha(containerId: string): Promise<RecaptchaVerifier | null> {
  await initFirebase();
  if (isFirebaseConfigured && firebaseAuth) {
    try {
      const verifier = new RecaptchaVerifier(firebaseAuth, containerId, {
        size: 'invisible',
      });
      return verifier;
    } catch (err) {
      console.error('[firebaseAuth] Recaptcha setup failed:', err);
      return null;
    }
  }
  return null;
}

export async function sendPhoneOtp(
  phoneNumber: string,
  verifier?: RecaptchaVerifier | null
): Promise<{ success: boolean; demoCode?: string }> {
  await initFirebase();
  if (isFirebaseConfigured && firebaseAuth && verifier) {
    try {
      confirmationResultRef = await signInWithPhoneNumber(firebaseAuth, phoneNumber, verifier);
      return { success: true };
    } catch (err: any) {
      console.warn('[firebaseAuth] Real phone SMS failed, falling back to simulated OTP:', err?.message);
    }
  }

  // Fallback demo/prototype OTP
  inMemoryOtpCode = '123456';
  return { success: true, demoCode: inMemoryOtpCode };
}

export async function verifyPhoneOtp(code: string, phoneNumber: string) {
  await initFirebase();
  if (isFirebaseConfigured && confirmationResultRef) {
    const cred = await confirmationResultRef.confirm(code);
    return cred.user;
  }

  // In-memory verification
  if (code.trim() === inMemoryOtpCode || code.trim() === '123456') {
    inMemoryCurrentUser = {
      uid: `mem_phone_${Date.now()}`,
      email: null,
      phoneNumber,
      displayName: 'Farmer ' + phoneNumber.slice(-4),
    };
    notifyInMemoryListeners();
    return inMemoryCurrentUser;
  }

  throw new Error('Invalid OTP code. Please enter 123456 for Demo verification.');
}

// Sign Out
export async function signOutAll() {
  if (isFirebaseConfigured && firebaseAuth) {
    await fbSignOut(firebaseAuth);
  }
  inMemoryCurrentUser = null;
  notifyInMemoryListeners();
}
