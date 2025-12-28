import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!
};

export const app = getApps().length ? getApps()[0] : initializeApp(config);
export const db = getFirestore(app);

let _messaging: any = null;
export async function getMsg() {
  if (_messaging) return _messaging;
  if (typeof window !== 'undefined' && (await isSupported())) {
    _messaging = getMessaging(app);
  }
  return _messaging;
}

