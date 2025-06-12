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

    // Get user UUID - you'll need to implement this based on your user identification
    const userUUID = user_id || extractUserFromConversation(conversation_id);

    if (!userUUID) {
      console.warn('⚠️ No user UUID found in webhook data');
      return res.status(400).json({ error: 'Missing user identification' });
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
      message: 'Webhook processed successfully' 
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
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
        conversation_id: data.conversation_id
      }
    };

    const contextRef = db.collection('users').doc(userUUID).collection('user_context').doc(contextId);
    await contextRef.set(contextEntry);
    
    console.log(`✅ Conversation data stored: ${contextId}`);
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

// Extract user UUID from conversation ID
function extractUserFromConversation(conversationId) {
  // Implement this based on how you identify users
  // You might need to maintain a mapping or encode user ID in conversation ID
  // For now, return null and rely on explicit user_id
  return null;
}
