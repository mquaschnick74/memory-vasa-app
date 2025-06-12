// lib/serverDb.js - ES Modules version for Vite project
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK (server-side)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

const db = admin.firestore();

// Store or update conversation ID to user UUID mapping
export const storeConversationMapping = async (conversationId, userUUID) => {
  try {
    const mappingRef = db.collection('conversation_mappings').doc(conversationId);
    
    await mappingRef.set({
      conversation_id: conversationId,
      user_uuid: userUUID,
      created_at: admin.firestore.Timestamp.now(),
      updated_at: admin.firestore.Timestamp.now(),
      source: 'elevenlabs_webhook'
    }, { merge: true });

    console.log(`✅ Conversation mapping stored: ${conversationId} -> ${userUUID}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to store conversation mapping:', error);
    throw error;
  }
};

// Get user UUID from conversation ID
export const getUserFromConversation = async (conversationId) => {
  try {
    if (!conversationId) {
      return null;
    }

    const mappingRef = db.collection('conversation_mappings').doc(conversationId);
    const mappingDoc = await mappingRef.get();

    if (mappingDoc.exists) {
      const mappingData = mappingDoc.data();
      console.log(`✅ Found user mapping: ${conversationId} -> ${mappingData.user_uuid}`);
      return mappingData.user_uuid;
    }

    console.warn(`⚠️ No user mapping found for conversation: ${conversationId}`);
    return null;

  } catch (error) {
    console.error('❌ Failed to extract user from conversation:', error);
    return null;
  }
};

// Register a new conversation when starting with ElevenLabs
export const registerConversation = async (userUUID, conversationId, additionalData = {}) => {
  try {
    if (!userUUID || !conversationId) {
      throw new Error('User UUID and conversation ID are required');
    }

    const mappingRef = db.collection('conversation_mappings').doc(conversationId);
    
    const mappingData = {
      conversation_id: conversationId,
      user_uuid: userUUID,
      created_at: admin.firestore.Timestamp.now(),
      updated_at: admin.firestore.Timestamp.now(),
      source: 'conversation_start',
      status: 'active',
      ...additionalData
    };

    await mappingRef.set(mappingData);
    
    console.log(`✅ Conversation registered: ${conversationId} -> ${userUUID}`);
    
    return {
      success: true,
      conversation_id: conversationId,
      user_uuid: userUUID,
      mapping_data: mappingData
    };

  } catch (error) {
    console.error('❌ Failed to register conversation:', error);
    throw error;
  }
};

// Store conversation data in the user_context collection
export const storeConversationData = async (userUUID, data) => {
  try {
    const contextId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const contextEntry = {
      context_id: contextId,
      context_type: 'therapeutic_session',
      created_at: admin.firestore.Timestamp.now(),
      updated_at: admin.firestore.Timestamp.now(),
      conversation_thread: [
        {
          message: data.message,
          sender: data.message_type === 'user_message' ? 'user' : 'assistant',
          timestamp: new Date(data.timestamp),
          message_type: 'text',
          stage_focus: 'webhook_response'
        }
      ],
      tags: ['webhook', 'elevenlabs'],
      priority: 3,
      metadata: {
        source: 'elevenlabs_webhook',
        agent_id: data.agent_id,
        conversation_id: data.conversation_id,
        original_timestamp: data.timestamp
      }
    };

    const contextRef = db.collection('users').doc(userUUID).collection('user_context').doc(contextId);
    await contextRef.set(contextEntry);
    
    console.log(`✅ Conversation data stored: ${contextId} for user ${userUUID}`);
    return contextId;
  } catch (error) {
    console.error('❌ Failed to store conversation data:', error);
    throw error;
  }
};

// Get conversation history for VASA context
export const getConversationHistory = async (userUUID, limit = 20) => {
  try {
    const contextRef = db.collection('users').doc(userUUID).collection('user_context');
    const snapshot = await contextRef
      .orderBy('created_at', 'desc')
      .limit(limit)
      .get();

    const conversations = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.conversation_thread) {
        conversations.push(...data.conversation_thread);
      }
    });

    // Sort by timestamp and return recent messages
    return conversations
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
      
  } catch (error) {
    console.error('❌ Failed to get conversation history:', error);
    return [];
  }
};
