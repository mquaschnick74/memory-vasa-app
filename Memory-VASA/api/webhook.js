// File: Memory-VASA/api/webhook.js - Session-isolated version

import admin from 'firebase-admin';

export default async function handler(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ========== 11LABS WEBHOOK REQUEST ==========`);
  console.log(`[${timestamp}] Body:`, JSON.stringify(req.body, null, 2));

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-elevenlabs-signature, x-elevenlabs-timestamp');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
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

    // Always use your specific Firebase user UUID
    const FIREBASE_USER_UUID = 'NEgpc2haPnU2ZafTt6ECEZZMpcK2';
    
    console.log(`[${timestamp}] 🎯 Processing for user: ${FIREBASE_USER_UUID}`);
    console.log(`[${timestamp}] 📞 11Labs conversation ID: ${conversation_id}`);

    // Get RECENT conversation history only (last 2 hours)
    const recentHistory = await getRecentConversationHistory(FIREBASE_USER_UUID, 2);
    
    console.log(`[${timestamp}] 📚 Retrieved RECENT conversation history:`, {
      userUUID: FIREBASE_USER_UUID,
      messageCount: recentHistory?.length || 0,
      timeWindow: '2 hours',
      recentMessages: recentHistory?.slice(-3).map(msg => ({
        type: msg.type,
        content: msg.content?.substring(0, 60) + '...',
        timestamp: msg.timestamp
      }))
    });

    // Filter out any messages that don't match current conversation topics
    const relevantHistory = filterRelevantHistory(recentHistory);
    
    console.log(`[${timestamp}] 🎯 Filtered relevant history:`, {
      originalCount: recentHistory?.length || 0,
      relevantCount: relevantHistory?.length || 0
    });

    // Return session-specific context
    const responseData = {
      success: true,
      user_uuid: FIREBASE_USER_UUID,
      conversation_id: conversation_id,
      context: relevantHistory || [],
      context_summary: generateSessionSummary(relevantHistory),
      session_info: {
        time_window: '2 hours',
        total_messages: recentHistory?.length || 0,
        relevant_messages: relevantHistory?.length || 0
      },
      timestamp: timestamp
    };

    console.log(`[${timestamp}] ✅ Returning session-specific context to 11Labs`);
    return res.status(200).json(responseData);

  } catch (error) {
    console.error(`[${timestamp}] ❌ Webhook error:`, error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: timestamp
    });
  }
}

// Get only recent conversation history (within specified hours)
async function getRecentConversationHistory(userUUID, hoursBack = 2) {
  try {
    const db = admin.firestore();
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    
    console.log(`🔍 Getting conversations newer than: ${cutoffTime.toISOString()}`);
    
    const userContextRef = db.collection('users').doc(userUUID).collection('user_context');
    const snapshot = await userContextRef
      .where('timestamp', '>', cutoffTime.toISOString())
      .orderBy('timestamp', 'asc')
      .get();
    
    const history = snapshot.docs.map(doc => doc.data());
    
    console.log(`📊 Retrieved ${history.length} recent messages for user ${userUUID}`);
    
    return history;
  } catch (error) {
    console.error('❌ Error getting recent conversation history:', error);
    return [];
  }
}

// Filter history to only include relevant conversations
function filterRelevantHistory(history) {
  if (!history || history.length === 0) {
    return [];
  }
  
  // Get only messages from the current session (last 10 messages)
  // This prevents confusion with old conversations
  const currentSession = history.slice(-10);
  
  console.log(`🎯 Filtering to current session: ${currentSession.length} messages`);
  
  return currentSession;
}

// Generate summary focused on current session
function generateSessionSummary(history) {
  if (!history || history.length === 0) {
    return 'No recent conversation history available for this session.';
  }
  
  // Focus on user messages to understand current topics
  const userMessages = history
    .filter(msg => msg.type === 'user' && msg.content?.trim().length > 0)
    .slice(-3); // Last 3 user messages only
  
  if (userMessages.length === 0) {
    return 'Current session just started.';
  }
  
  const topics = userMessages.map(msg => 
    `User mentioned: "${msg.content?.substring(0, 100)}"`
  ).join(' | ');
    
  return `Current session context: ${topics}`;
}
