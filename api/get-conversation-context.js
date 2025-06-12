// /api/get-conversation-context.js - Retrieve context for ElevenLabs agent
import { getConversationHistory, getUserFromConversation } from '../lib/serverDb.js';

export default async function handler(req, res) {
  // Allow GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get parameters from query or body
    const { user_id, conversation_id, limit = 20 } = 
      req.method === 'GET' ? req.query : req.body;

    // Determine user UUID
    let userUUID = user_id;
    
    // If we only have conversation_id, look up the user
    if (!userUUID && conversation_id) {
      userUUID = await getUserFromConversation(conversation_id);
    }

    if (!userUUID) {
      return res.status(400).json({ 
        error: 'Missing user identification',
        details: 'Provide either user_id or conversation_id' 
      });
    }

    // Get conversation history
    const conversationHistory = await getConversationHistory(userUUID, parseInt(limit));

    // Format the response for ElevenLabs
    const formattedContext = conversationHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.message,
      timestamp: msg.timestamp
    }));

    // Create a context summary for the agent
    const contextSummary = formattedContext.length > 0 
      ? `Previous conversation context (${formattedContext.length} messages): ${formattedContext.map(m => `${m.role}: ${m.content}`).join(' | ')}`
      : 'No previous conversation history found.';

    return res.status(200).json({
      success: true,
      user_uuid: userUUID,
      conversation_count: formattedContext.length,
      context: formattedContext,
      context_summary: contextSummary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Failed to retrieve context:', error);
    return res.status(500).json({ 
      error: 'Failed to retrieve conversation context',
      details: error.message 
    });
  }
}
