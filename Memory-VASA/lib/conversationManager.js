// /lib/conversationManager.js - Helper functions for managing conversations
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
  });
}

const db = admin.firestore();

// Call this function when you start a new conversation with ElevenLabs
export async function registerConversation(userUUID, conversationId, additionalData = {}) {
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
      ...additionalData // Allow for additional metadata
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
}

// Get all conversations for a user
export async function getUserConversations(userUUID) {
  try {
    const mappingsRef = db.collection('conversation_mappings');
    const snapshot = await mappingsRef
      .where('user_uuid', '==', userUUID)
      .orderBy('created_at', 'desc')
      .get();

    const conversations = [];
    snapshot.forEach(doc => {
      conversations.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return conversations;

  } catch (error) {
    console.error('❌ Failed to get user conversations:', error);
    throw error;
  }
}

// End/close a conversation
export async function endConversation(conversationId, reason = 'user_ended') {
  try {
    const mappingRef = db.collection('conversation_mappings').doc(conversationId);
    
    await mappingRef.update({
      status: 'ended',
      ended_at: admin.firestore.Timestamp.now(),
      end_reason: reason,
      updated_at: admin.firestore.Timestamp.now()
    });

    console.log(`✅ Conversation ended: ${conversationId}`);
    
    return { success: true, conversation_id: conversationId };

  } catch (error) {
    console.error('❌ Failed to end conversation:', error);
    throw error;
  }
}

// Get conversation details
export async function getConversationDetails(conversationId) {
  try {
    const mappingRef = db.collection('conversation_mappings').doc(conversationId);
    const doc = await mappingRef.get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data()
    };

  } catch (error) {
    console.error('❌ Failed to get conversation details:', error);
    throw error;
  }
}

// Clean up old ended conversations (optional maintenance function)
export async function cleanupOldConversations(daysOld = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const mappingsRef = db.collection('conversation_mappings');
    const snapshot = await mappingsRef
      .where('status', '==', 'ended')
      .where('ended_at', '<', admin.firestore.Timestamp.fromDate(cutoffDate))
      .get();

    const batch = db.batch();
    let deleteCount = 0;

    snapshot.forEach(doc => {
      batch.delete(doc.ref);
      deleteCount++;
    });

    if (deleteCount > 0) {
      await batch.commit();
      console.log(`✅ Cleaned up ${deleteCount} old conversations`);
    }

    return { success: true, deleted_count: deleteCount };

  } catch (error) {
    console.error('❌ Failed to cleanup old conversations:', error);
    throw error;
  }
}
