// /api/webhook.js - Server-side webhook handler for Vercel
const { 
  getUserFromConversation, 
  storeConversationMapping, 
  storeConversationData, 
  getConversationHistory 
} = require('../lib/serverDb.js');

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
      userUUID = await getUserFromConversation(conversation_id);
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
