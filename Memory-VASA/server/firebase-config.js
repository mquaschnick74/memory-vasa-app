// server/firebase-config.js - SERVER SIDE ONLY
// This file uses Firebase Admin SDK for server-side operations

// Ensure we're in server environment
if (typeof window !== 'undefined') {
  throw new Error('server/firebase-config.js should only be used on the server, not in browser');
}

console.log('🔧 Loading Firebase Admin SDK for server...');
console.log('Environment:', typeof window !== 'undefined' ? 'Browser' : 'Server');

// Import Firebase Admin SDK (server-side)
import admin from 'firebase-admin';

let firebaseApp = null;
let db = null;

function initializeFirebaseAdmin() {
  // Check if Firebase Admin is already initialized
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
    let projectId;

    // Option A: Use complete service account JSON (recommended for Vercel)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.log('🔧 Using FIREBASE_SERVICE_ACCOUNT_KEY...');
      
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        credential = admin.credential.cert(serviceAccount);
        projectId = serviceAccount.project_id;
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
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
      projectId = process.env.FIREBASE_PROJECT_ID;
    } else {
      throw new Error('Missing Firebase Admin environment variables. Need either FIREBASE_SERVICE_ACCOUNT_KEY or individual variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)');
    }
    
    // Initialize Firebase Admin
    firebaseApp = admin.initializeApp({
      credential: credential,
      projectId: projectId,
    });
    
    // Initialize Firestore
    db = admin.firestore();
    
    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log('✅ Firestore database connected');
    
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', {
      message: error.message,
      code: error.code
    });
    throw error;
  }
}

// Export safe getters that ensure initialization
export const getFirebaseApp = () => {
  if (!firebaseApp) {
    console.log('🔧 Firebase Admin app not initialized, initializing now...');
    initializeFirebaseAdmin();
  }
  return firebaseApp;
};

export const getFirebaseDb = () => {
  if (!db) {
    console.log('🔧 Firestore Admin DB not initialized, initializing now...');
    initializeFirebaseAdmin();
  }
  return db;
};

// Test Firebase Admin connection
export const testFirebaseConnection = async () => {
  try {
    const database = getFirebaseDb();
    
    // Try to read from a test collection
    const testQuery = await database.collection('_connection_test').limit(1).get();
    console.log('✅ Firebase Admin read test successful');
    
    // Try to write to a test collection
    const testWrite = await database.collection('_connection_test').add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      test: 'admin_connection_test',
      environment: process.env.NODE_ENV || 'unknown',
      vercel: !!process.env.VERCEL,
      adminSDK: true
    });
    console.log('✅ Firebase Admin write test successful, document ID:', testWrite.id);
    
    return { success: true, canRead: true, canWrite: true, testDocId: testWrite.id };
  } catch (error) {
    console.error('❌ Firebase Admin connection test failed:', error);
    return { success: false, error: error.message, code: error.code };
  }
};

// Export admin instance for direct use if needed
export { admin };

// Initialize immediately when this module is imported
console.log('🚀 Loading Firebase Admin SDK module...');
initializeFirebaseAdmin();
