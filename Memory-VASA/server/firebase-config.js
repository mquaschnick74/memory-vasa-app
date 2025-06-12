// frontend firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// 🐛 DEBUG: Check if we're in browser vs server
console.log('Environment:', typeof window !== 'undefined' ? 'Browser' : 'Server');
console.log('All env vars:', Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC')));

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// 🐛 DEBUG: Log each field individually
console.log('🔧 Firebase Config Debug:');
console.log('apiKey:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ SET' : '❌ MISSING');
console.log('authDomain:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✅ SET' : '❌ MISSING');
console.log('projectId:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅ SET' : '❌ MISSING');
console.log('storageBucket:', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? '✅ SET' : '❌ MISSING');
console.log('messagingSenderId:', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? '✅ SET' : '❌ MISSING');
console.log('appId:', process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? '✅ SET' : '❌ MISSING');
console.log('Final config object:', firebaseConfig);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
