import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

import { getFirebaseEnvStatus } from "@/lib/firebase-env";

let firestoreInstance: ReturnType<typeof getFirestore> | null = null;

export function getFirebaseApp() {
  const env = getFirebaseEnvStatus();

  if (!env.isConfigured) {
    throw new Error(`Firebase is not configured. Missing: ${env.missing.join(", ")}`);
  }

  const firebaseConfig = {
    apiKey: env.values.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.values.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.values.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.values.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.values.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.values.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export function getFirestoreDb() {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  firestoreInstance = getFirestore(getFirebaseApp());
  return firestoreInstance;
}
