// /api/webhook.js - Server-side webhook handler for Vercel
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK (server-side)
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

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify webhook secret
    const signature = req.headers['x-elevenlabs-signature'];
    const expectedSignature = process.env.ELEVENLABS_WEBHOOK_SECRET;
    
    if (signature !== expectedSignature) {
      console.log('❌ Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('✅ Webhook signature verified');

    // Process the webhook data
    const webhookData = req.body;
    console.log('📨 Received webhook:', webhookData);

    // Extract important data
    const { 
      agent_id, 
      conversation_id, 
      user_id, 
      message, 
      message_type, 
      timestamp 
    } = webhookData;

    // Get user UUID - try user_id first, then look up by conversation_id
    let userUUID = user_id;
    
    if (!userUUID && conversation_id) {
      userUUID = await extractUserFromConversation(conversation_id);
    }

    if (!userUUID) {
      console.warn('⚠️ No user UUID found in webhook data', {
        user_id: user_id,
        conversation_id: conversation_id,
        has_message: !!message
      });
      return res.status(400).json({ error: 'Missing user identification' });
    }

    // Store the conversation mapping for future reference
    if (conversation_id && userUUID) {
      await storeConversationMapping(conversation_id, userUUID);
    }

    // Store conversation data in Firebase
    await storeConversationData(userUUID, {
      message,
      message_type,
      conversation_id,
      agent_id,
      timestamp: timestamp || new Date().toISOString()
    });

    // If this is a user message, fetch conversation history and send to VASA
    if (message_type === 'user_message') {
      const conversationHistory = await getConversationHistory(userUUID);
      
      // Here you would send the conversation context to VASA
      // This depends on how your VASA integration works
      console.log('💭 Conversation context prepared for VASA:', conversationHistory.length, 'messages');
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Webhook processed successfully',
      user_uuid: userUUID,
      conversation_id: conversation_id
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// Store or update conversation ID to user UUID mapping
async function storeConversationMapping(conversationId, userUUID) {
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
  } catch (error) {
    console.error('❌ Failed to store conversation mapping:', error);
    // Don't throw here - mapping failure shouldn't break the whole webhook
  }
}

// Extract user UUID from conversation ID by looking up in Firebase
async function extractUserFromConversation(conversationId) {
  try {
    if (!conversationId) {
      return null;
    }

    // Look up the conversation mapping in Firebase
    const mappingRef = db.collection('conversation_mappings').doc(conversationId);
    const mappingDoc = await mappingRef.get();

    if (mappingDoc.exists) {
      const mappingData = mappingDoc.data();
      console.log(`✅ Found user mapping: ${conversationId} -> ${mappingData.user_uuid}`);
      return mappingData.user_uuid;
    }

    // If no mapping found, try to extract from conversation ID pattern
    // This is a fallback - you might encode user IDs in conversation IDs
    const extractedUserId = extractUserIdFromConversationPattern(conversationId);
    if (extractedUserId) {
      console.log(`✅ Extracted user from conversation pattern: ${extractedUserId}`);
      return extractedUserId;
    }

    console.warn(`⚠️ No user mapping found for conversation: ${conversationId}`);
    return null;

  } catch (error) {
    console.error('❌ Failed to extract user from conversation:', error);
    return null;
  }
}

// Try to extract user ID from conversation ID pattern (fallback method)
function extractUserIdFromConversationPattern(conversationId) {
  try {
    // Example patterns you might use:
    // 1. If conversation IDs are formatted like "user_12345_conv_67890"
    if (conversationId.includes('user_')) {
      const userMatch = conversationId.match(/user_([a-f0-9\-]+)/);
      if (userMatch) {
        return userMatch[1];
      }
    }

    // 2. If conversation IDs are base64 encoded with user info
    // const decoded = Buffer.from(conversationId, 'base64').toString('utf-8');
    // const data = JSON.parse(decoded);
    // return data.userId;

    // 3. If you prefix conversation IDs with user UUIDs
    // if (conversationId.length > 36) {
    //   const possibleUUID = conversationId.substring(0, 36);
    //   if (possibleUUID.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    //     return possibleUUID;
    //   }
    // }

    return null;
  } catch (error) {
    console.error('❌ Error extracting user from conversation pattern:', error);
    return null;
  }
}

// Store conversation data in Firebase
async function storeConversationData(userUUID, data) {
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
  } catch (error) {
    console.error('❌ Failed to store conversation data:', error);
    throw error;
  }
}

// Get conversation history for VASA context
async function getConversationHistory(userUUID, limit = 20) {
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
}
