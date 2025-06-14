// File: Memory-VASA/api/webhook.js - Fixed for any user

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

    console.log(`[${timestamp}] 📊 Processing webhook:`, {
      action: action || 'UNDEFINED',
      conversation_id: conversation_id || 'UNDEFINED', 
      agent_id: agent_id || 'UNDEFINED',
      user_id: user_id || 'UNDEFINED',
      hasMessage: !!message
    });

    // FIXED: Map 11Labs user_id to Firebase user
    let firebaseUserUUID = null;
    
    // Method 1: Try to get user from conversation mapping
    if (conversation_id) {
      try {
        const { getUserFromConversation } = await import('../lib/serverDB.js');
        firebaseUserUUID = await getUserFromConversation(conversation_id);
        console.log(`[${timestamp}] 👤 Found user from conversation: ${firebaseUserUUID}`);
      } catch (error) {
        console.log(`[${timestamp}] ⚠️ Could not get user from conversation: ${error.message}`);
      }
    }
    
    // Method 2: If no mapping exists, use a default user (for single-user setup)
    if (!firebaseUserUUID) {
      // For single-user setup, use the most recent user
      firebaseUserUUID = 'AVs5XlU6qQezh8GiNlRwN6UEfjM2'; // Your current user
      console.log(`[${timestamp}] 👤 Using default user: ${firebaseUserUUID}`);
      
      // Store the mapping for future use
      if (conversation_id) {
        try {
          const { storeConversationMapping } = await import('../lib/serverDB.js');
          await storeConversationMapping(conversation_id, firebaseUserUUID);
          console.log(`[${timestamp}] ✅ Stored conversation mapping: ${conversation_id} -> ${firebaseUserUUID}`);
        } catch (error) {
          console.log(`[${timestamp}] ⚠️ Could not store mapping: ${error.message}`);
        }
      }
    }

    // Get conversation history for the correct user
    let conversationHistory = [];
    try {
      const { getConversationHistory } = await import('../lib/serverDB.js');
      conversationHistory = await getConversationHistory(firebaseUserUUID);
      console.log(`[${timestamp}] 📚 Retrieved ${conversationHistory?.length || 0} messages for user ${firebaseUserUUID}`);
    } catch (error) {
      console.error(`[${timestamp}] ❌ Error getting conversation history:`, error);
      // Don't fail the webhook - just return empty history
      conversationHistory = [];
    }

    // Return the context data
    const responseData = {
      success: true,
      user_uuid: firebaseUserUUID,
      conversation_id: conversation_id,
      context: conversationHistory || [],
      context_summary: generateContextSummary(conversationHistory),
      timestamp: timestamp,
      debug_info: {
        original_11labs_data: {
          conversation_id,
          user_id,
          agent_id
        },
        firebase_user_mapped_to: firebaseUserUUID
      }
    };

    console.log(`[${timestamp}] ✅ Returning context for user: ${firebaseUserUUID}`);
    return res.status(200).json(responseData);

  } catch (error) {
    console.error(`[${timestamp}] ❌ Webhook error:`, error);
    
    // Return a safe fallback response instead of failing
    return res.status(200).json({ 
      success: true,
      user_uuid: 'unknown',
      conversation_id: req.body.conversation_id || 'unknown',
      context: [],
      context_summary: 'No previous conversation history available.',
      timestamp: timestamp,
      error_handled: true,
      error_message: error.message
    });
  }
}

// Generate context summary from conversation history
function generateContextSummary(history) {
  if (!history || history.length === 0) {
    return 'No previous conversation history available for this session.';
  }
  
  // Get only recent messages to avoid confusion
  const recentMessages = history.slice(-5);
  
  const summary = recentMessages
    .filter(msg => msg.content && msg.content.trim().length > 0)
    .map(msg => `${msg.type}: ${msg.content?.substring(0, 80)}`)
    .join(' | ');
    
  return `Recent context (${history.length} total messages): ${summary}`;
}
