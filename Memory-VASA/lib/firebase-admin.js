// lib/firebase-admin.js - SERVER SIDE ONLY
// This file should NEVER be imported by client-side code

// Check if we're in a server environment
if (typeof window !== 'undefined') {
  throw new Error('firebase-admin.js should only be used in server-side code, not in the browser');
}

// Import Firebase Admin SDK (server-side only)
import admin from 'firebase-admin';

let firebaseApp = null;
let db = null;

function initializeFirebase() {
  // Check if Firebase is already initialized
  if (admin.apps.length > 0) {
    console.log('✅ Firebase Admin already initialized');
    firebaseApp = admin.apps[0];
    db = admin.firestore();
    return;
  }

  try {
    console.log('🔧 Initializing Firebase Admin SDK...');
    
    // Log environment variables (without exposing sensitive data)
    console.log('Environment check:', {
      hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      nodeEnv: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL
    });

    let credential;

    // Option A: Use complete service account JSON (recommended for Vercel)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.log('🔧 Using FIREBASE_SERVICE_ACCOUNT_KEY...');
      
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        credential = admin.credential.cert(serviceAccount);
      } catch (parseError) {
        throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY: ${parseError.message}`);
      }
    } 
    // Option B: Use individual environment variables
    else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      console.log('🔧 Using individual Firebase environment variables...');
      
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Important: Replace \\n with actual newlines in private key
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    } else {
      throw new Error('Missing Firebase environment variables. Need either FIREBASE_SERVICE_ACCOUNT_KEY or individual variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)');
    }
    
    // Initialize Firebase Admin
    firebaseApp = admin.initializeApp({
      credential: credential,
      projectId: process.env.FIREBASE_PROJECT_ID || JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}').project_id,
    });
    
    // Initialize Firestore
    db = admin.firestore();
    
    // Configure Firestore settings for better performance
    db.settings({
      timestampsInSnapshots: true,
      ignoreUndefinedProperties: true,
    });
    
    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log('✅ Firestore database connected');
    
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
}

// Export safe getters that ensure initialization
export const getFirebaseApp = () => {
  if (!firebaseApp) {
    console.log('🔧 Firebase app not initialized, initializing now...');
    initializeFirebase();
  }
  return firebaseApp;
};

export const getFirebaseDb = () => {
  if (!db) {
    console.log('🔧 Firestore DB not initialized, initializing now...');
    initializeFirebase();
  }
  return db;
};

// Test Firebase connection - SERVER SIDE ONLY
export const testFirebaseConnection = async () => {
  try {
    const database = getFirebaseDb();
    
    // Try to read from a test collection
    const testQuery = await database.collection('_connection_test').limit(1).get();
    console.log('✅ Firebase read test successful');
    
    // Try to write to a test collection
    const testWrite = await database.collection('_connection_test').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      test: 'connection_test',
      environment: process.env.NODE_ENV || 'unknown',
      vercel: !!process.env.VERCEL
    });
    console.log('✅ Firebase write test successful, document ID:', testWrite.id);
    
    return { success: true, canRead: true, canWrite: true, testDocId: testWrite.id };
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    return { success: false, error: error.message, code: error.code };
  }
};

// Initialize immediately when this module is imported (server-side only)
console.log('🚀 Loading Firebase Admin SDK module...');
initializeFirebase();
