import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase safely from imported config or environment variables
const safeConfig = {
  projectId: firebaseConfig?.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || 'live-track-799f8',
  appId: firebaseConfig?.appId || import.meta.env.VITE_FIREBASE_APP_ID || '',
  apiKey: firebaseConfig?.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: firebaseConfig?.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'live-track-799f8.firebaseapp.com',
};

const app = getApps().length === 0 ? initializeApp(safeConfig) : getApp();
export const auth = getAuth(app);

// Configure Google OAuth provider with Google Sheets scope
export const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

// Force account selector modal so user can choose ANY account (e.g., dedicated RPA Google account)
provider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to indicate if we are in the middle of a sign-in flow
let isSigningIn = false;
// In-memory cache for OAuth access token (per security guidelines, not in localStorage)
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token not yet retrieved or expired in memory; app can prompt login when needed
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Impossible d\'obtenir le jeton d\'accès Google Sheets.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Erreur de connexion Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};
