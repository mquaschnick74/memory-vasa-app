// lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Debug alert to confirm file is running
alert('LIB/FIREBASE.JS IS RUNNING!');

// 🐛 DEBUG: Check what we're getting
console.log('🔧 DEBUG - Environment Variables:');
console.log('API Key:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'EXISTS' : 'MISSING');
console.log('Auth Domain:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'EXISTS' : 'MISSING');
console.log('Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? 'EXISTS' : 'MISSING');
console.log('Storage Bucket:', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? 'EXISTS' : 'MISSING');
console.log('Messaging Sender ID:', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? 'EXISTS' : 'MISSING');
console.log('App ID:', process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? 'EXISTS' : 'MISSING');

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

console.log('🔧 Final Config Object:', firebaseConfig);

// Validate configuration
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

if (missingFields.length > 0) {
  console.error('❌ Missing Firebase configuration fields:', missingFields);
  console.error('📌 Please check your environment variables');
  throw new Error(`Missing Firebase configuration: ${missingFields.join(', ')}`);
}

console.log('✅ Firebase config loaded for project:', firebaseConfig.projectId);

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Export the app for other uses
export default app;
