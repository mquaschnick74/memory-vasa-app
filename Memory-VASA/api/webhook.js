// File: Memory-VASA/api/webhook.js - Fixed user mapping

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
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract all possible user identifiers from 11Labs
    const { 
      action, 
      conversation_id, 
      agent_id, 
      user_id,
      call_id,
      phone_number,
      caller_id,
      message,
      // These might contain user info
      metadata,
      custom_llm_extra_body
    } = req.body;

    console.log(`[${timestamp}] 🔍 ALL user identifiers from 11Labs:`, {
      conversation_id,
      user_id, 
      agent_id,
      call_id,
      phone_number,
      caller_id,
      metadata,
      custom_llm_extra_body,
      hasMessage: !!message
    });

    // CRITICAL: Map to your specific user
    // Since this is your personal agent, always use your Firebase UUID
    const FIREBASE_USER_UUID = 'NEgpc2haPnU2ZafTt6ECEZZMpcK2';
    
    console.log(`[${timestamp}] 🎯 Using Firebase User UUID: ${FIREBASE_USER_UUID}`);

    // Get conversation history for the CORRECT user
    const conversationHistory = await getConversationHistoryForUser(FIREBASE_USER_UUID);
    
    console.log(`[${timestamp}] 📚 Retrieved conversation history:`, {
      userUUID: FIREBASE_USER_UUID,
      messageCount: conversationHistory?.length || 0,
      recentMessages: conversationHistory?.slice(-3).map(msg => ({
        type: msg.type,
        content: msg.content?.substring(0, 100) + '...'
      }))
    });

    // Return the CORRECT user's context
    const responseData = {
      success: true,
      user_uuid: FIREBASE_USER_UUID,
      conversation_id: conversation_id,
      context: conversationHistory || [],
      context_summary: generateContextSummary(conversationHistory),
      timestamp: timestamp,
      debug_info: {
        original_11labs_data: {
          conversation_id,
          user_id,
          agent_id
        }
      }
    };

    console.log(`[${timestamp}] ✅ Returning CORRECT user context to 11Labs`);
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

// Get conversation history for the specific Firebase user
async function getConversationHistoryForUser(userUUID) {
  try {
    // Import your Firebase functions
    const { getConversationHistory } = await import('../lib/serverDB.js');
    
    console.log(`🔍 Getting conversation history for user: ${userUUID}`);
    
    const history = await getConversationHistory(userUUID);
    
    console.log(`📊 Retrieved ${history?.length || 0} messages for user ${userUUID}`);
    
    return history;
  } catch (error) {
    console.error('❌ Error getting conversation history:', error);
    return [];
  }
}

// Generate context summary from the CORRECT user's history
function generateContextSummary(history) {
  if (!history || history.length === 0) {
    return 'No previous conversation history available.';
  }
  
  // Get only recent messages to avoid confusion
  const recentMessages = history.slice(-5);
  
  const summary = recentMessages
    .filter(msg => msg.content && msg.content.trim().length > 0)
    .map(msg => `${msg.type}: ${msg.content?.substring(0, 80)}`)
    .join(' | ');
    
  return `Recent context (${history.length} total messages): ${summary}`;
}
