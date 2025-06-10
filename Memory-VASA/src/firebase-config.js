// frontend firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// 🔍 DEBUG: Check Vite environment variables
console.log('🔍 Environment:', typeof window !== 'undefined' ? 'Browser' : 'Server');
console.log('🔍 import.meta.env:', import.meta.env);
console.log('🔍 All VITE vars:', Object.keys(import.meta.env || {}).filter(key => key.startsWith('VITE')));

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 🔍 DEBUG: Log each field individually  
console.log('🔧 Firebase Config Debug:');
console.log('apiKey:', import.meta.env.VITE_FIREBASE_API_KEY ? '✅ SET' : '❌ MISSING');
console.log('authDomain:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? '✅ SET' : '❌ MISSING');
console.log('projectId:', import.meta.env.VITE_FIREBASE_PROJECT_ID ? '✅ SET' : '❌ MISSING');
console.log('storageBucket:', import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ? '✅ SET' : '❌ MISSING');
console.log('messagingSenderId:', import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ? '✅ SET' : '❌ MISSING');
console.log('appId:', import.meta.env.VITE_FIREBASE_APP_ID ? '✅ SET' : '❌ MISSING');
console.log('🔍 Final config object:', firebaseConfig);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
