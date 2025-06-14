// File: Memory-VASA/api/webhook.js - Standalone version without external dependencies

import admin from 'firebase-admin';

// Initialize Firebase Admin (only if not already initialized)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: `https://${process.env.VITE_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com/`
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

export default async function handler(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ========== 11LABS WEBHOOK REQUEST ==========`);
  console.log(`[${timestamp}] Method: ${req.method}`);
  console.log(`[${timestamp}] Body:`, JSON.stringify(req.body, null, 2));

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-elevenlabs-signature, x-elevenlabs-timestamp');

  if (req.method === 'OPTIONS') {
    console.log(`[${timestamp}] Handling OPTIONS preflight request`);
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    console.log(`[${timestamp}] ❌ Method not allowed: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      action, 
      conversation_id, 
      agent_id, 
      user_id,
      message
    } = req.body;

    console.log(`[${timestamp}] 📊 Processing webhook:`, {
      action: action || 'UNDEFINED',
      conversation_id: conversation_id || 'UNDEFINED', 
      agent_id: agent_id || 'UNDEFINED',
      user_id: user_id || 'UNDEFINED',
      hasMessage: !!message
    });

    // Use current user UUID - update this to your current user
    const CURRENT_USER_UUID = 'AVs5XlU6qQezh8GiNlRwN6UEfjM2';
    
    console.log(`[${timestamp}] 👤 Using user UUID: ${CURRENT_USER_UUID}`);

    // Get conversation history from Firestore
    let conversationHistory = [];
    try {
      console.log(`[${timestamp}] 🔍 Getting conversation history from Firestore...`);
      
      const db = admin.firestore();
      const userContextRef = db.collection('users').doc(CURRENT_USER_UUID).collection('user_context');
      const snapshot = await userContextRef.orderBy('timestamp', 'asc').limit(20).get();
      
      conversationHistory = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          type: data.type || 'unknown',
          content: data.content || '',
          timestamp: data.timestamp || '',
          stage: data.stage || '',
          conversation_id: data.conversation_id || ''
        };
      });
      
      console.log(`[${timestamp}] 📚 Retrieved ${conversationHistory.length} messages from Firestore`);
      
    } catch (firestoreError) {
      console.error(`[${timestamp}] ❌ Firestore error:`, firestoreError);
      // Don't fail the webhook - continue with empty history
      conversationHistory = [];
    }

    // Generate context summary
    const contextSummary = generateContextSummary(conversationHistory);
    
    // Prepare response data
    const responseData = {
      success: true,
      user_uuid: CURRENT_USER_UUID,
      conversation_id: conversation_id || 'unknown',
      context: conversationHistory,
      context_summary: contextSummary,
      timestamp: timestamp,
      webhook_status: 'WEBHOOK_SUCCESSFULLY_PROCESSED',
      debug_info: {
        conversation_count: conversationHistory.length,
        action_processed: action,
        agent_id: agent_id
      }
    };

    console.log(`[${timestamp}] ✅ Webhook processed successfully`);
    console.log(`[${timestamp}] 📊 Returning context with ${conversationHistory.length} messages`);
    
    return res.status(200).json(responseData);

  } catch (error) {
    console.error(`[${timestamp}] ❌ Webhook error:`, error);
    console.error(`[${timestamp}] ❌ Error stack:`, error.stack);
    
    // Return a safe fallback response to prevent 11Labs disconnection
    const fallbackResponse = {
      success: true,
      user_uuid: 'AVs5XlU6qQezh8GiNlRwN6UEfjM2',
      conversation_id: req.body.conversation_id || 'unknown',
      context: [],
      context_summary: 'No previous conversation history available.',
      timestamp: timestamp,
      webhook_status: 'WEBHOOK_ERROR_HANDLED',
      error_handled: true,
      error_message: error.message
    };
    
    console.log(`[${timestamp}] 🛡️ Returning fallback response to prevent disconnection`);
    return res.status(200).json(fallbackResponse);
  }
}

// Generate context summary from conversation history
function generateContextSummary(history) {
  if (!history || history.length === 0) {
    return 'No previous conversation history available for this session.';
  }
  
  // Get only user messages to understand what user has discussed
  const userMessages = history
    .filter(msg => msg.type === 'user' && msg.content?.trim().length > 0)
    .slice(-3); // Last 3 user messages
  
  if (userMessages.length === 0) {
    return 'Current session just started.';
  }
  
  const topics = userMessages.map(msg => 
    `User said: "${msg.content?.substring(0, 100)}"`
  ).join(' | ');
    
  return `Recent conversation context (${history.length} total messages): ${topics}`;
}
