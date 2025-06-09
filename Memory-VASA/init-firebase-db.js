// init-firebase-db.js
// Run this script once to initialize your Firebase database with proper collections

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

console.log('🔥 Initializing Firebase for project:', firebaseConfig.projectId);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function initializeDatabase() {
  try {
    console.log('📦 Creating initial collections...');

    // Define collections
    const collections = {
      conversations: 'conversations',
      profiles: 'user_profiles',
      stages: 'stage_progressions',
      sessions: 'conversation_sessions'
    };

    // Create a test document in each collection to initialize them
    const testUserUUID = 'test-user-001';

    // 1. Initialize conversations collection
    console.log('Creating conversations collection...');
    const conversationRef = doc(db, collections.conversations, 'init-doc');
    await setDoc(conversationRef, {
      userUUID: testUserUUID,
      type: 'system',
      content: 'Database initialized',
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
      metadata: {
        source: 'initialization'
      }
    });
    console.log('✅ Conversations collection created');

    // 2. Initialize user_profiles collection
    console.log('Creating user_profiles collection...');
    const profileRef = doc(db, collections.profiles, testUserUUID);
    await setDoc(profileRef, {
      userUUID: testUserUUID,
      name: 'Test User',
      createdAt: new Date().toISOString(),
      lastUpdated: serverTimestamp(),
      metadata: {
        initialized: true
      }
    });
    console.log('✅ User profiles collection created');

    // 3. Initialize stage_progressions collection
    console.log('Creating stage_progressions collection...');
    const stageRef = doc(db, collections.stages, 'init-doc');
    await setDoc(stageRef, {
      userUUID: testUserUUID,
      type: 'stage_progression',
      stage: 'initialization',
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString()
    });
    console.log('✅ Stage progressions collection created');

    // 4. Initialize conversation_sessions collection
    console.log('Creating conversation_sessions collection...');
    const sessionRef = doc(db, collections.sessions, testUserUUID);
    await setDoc(sessionRef, {
      userUUID: testUserUUID,
      lastActivity: serverTimestamp(),
      messageCount: 0,
      createdAt: new Date().toISOString()
    });
    console.log('✅ Conversation sessions collection created');

    console.log('\n🎉 Database initialization complete!');
    console.log('📊 Collections created:');
    console.log('  - conversations');
    console.log('  - user_profiles');
    console.log('  - stage_progressions');
    console.log('  - conversation_sessions');
    console.log('\n🧹 You can now delete the test documents from Firebase console if desired.');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    console.error('Details:', error.message);
  }
}

// Run the initialization
initializeDatabase();