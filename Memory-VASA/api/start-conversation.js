// /api/start-conversation.js - API endpoint to start ElevenLabs conversation
const { registerConversation } = require('../lib/serverDb.js');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userUUID, agentId } = req.body;

    if (!userUUID) {
      return res.status(400).json({ error: 'User UUID is required' });
    }

    // Start conversation with ElevenLabs
    const elevenLabsResponse = await fetch('https://api.elevenlabs.io/v1/convai/conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        agent_id: agentId || process.env.ELEVENLABS_AGENT_ID,
        // Add other ElevenLabs configuration as needed
      })
    });

    if (!elevenLabsResponse.ok) {
      throw new Error(`ElevenLabs API error: ${elevenLabsResponse.status}`);
    }

    const conversationData = await elevenLabsResponse.json();
    const conversationId = conversationData.conversation_id;

    // Register the conversation mapping IMMEDIATELY after creation
    await registerConversation(userUUID, conversationId, {
      agent_id: agentId || process.env.ELEVENLABS_AGENT_ID,
      session_type: 'therapeutic_session',
      started_via: 'api_endpoint'
    });

    console.log(`✅ New conversation started: ${conversationId} for user ${userUUID}`);

    return res.status(200).json({
      success: true,
      conversation_id: conversationId,
      user_uuid: userUUID,
      message: 'Conversation started and registered successfully'
    });

  } catch (error) {
    console.error('❌ Failed to start conversation:', error);
    return res.status(500).json({
      error: 'Failed to start conversation',
      details: error.message
    });
  }
}
