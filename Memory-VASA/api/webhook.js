// api/webhook.js - Simple custom user ID implementation
import crypto from 'crypto';
import mem0Service from '../lib/mem0Service.js';
import firebaseMemoryManager from '../lib/firebaseMemoryManager.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify webhook signature (unchanged)
    const signature = req.headers['x-elevenlabs-signature'];
    const expectedSignature = process.env.ELEVENLABS_WEBHOOK_SECRET;

    if (signature !== expectedSignature) {
      console.log('❌ Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('✅ Webhook signature verified');

    const webhookData = req.body;
    console.log('📨 Received webhook:', webhookData);

    const {
      agent_id,
      conversation_id,
      user_id: elevenLabsUserId,
      message,
      message_type,
      timestamp,
      user_metadata  // This is where your custom user ID comes from
    } = webhookData;

    // 🎯 KEY CHANGE: Use your custom user ID instead of ElevenLabs user ID
    const customUserId = user_metadata?.custom_user_id || user_metadata?.patient_id || elevenLabsUserId;
    
    console.log(`🆔 Using custom user ID: ${customUserId}`);

    // Everything else stays EXACTLY the same - just use customUserId instead
    const conversationData = {
      agent_id,
      conversation_id,
      user_id: customUserId,  // 🎯 This is the only change needed
      message,
      message_type,
      timestamp: timestamp || new Date().toISOString(),
      messages: [
        {
          role: message_type === 'user_message' ? 'user' : 'assistant',
          content: message
        }
      ]
    };

    // All existing functionality works with custom user ID
    if (message_type === 'conversation_end') {
      console.log('🔚 Processing conversation end');
      
      const conversationHistory = await firebaseMemoryManager.getConversationHistory(
        customUserId,  // 🎯 Custom user ID
        conversation_id
      );

      if (conversationHistory.length > 0) {
        const allMessages = conversationHistory.flatMap(entry => entry.messages || []);
        
        // Mem0 works perfectly with custom user ID
        await mem0Service.addMemory(customUserId, {  // 🎯 Custom user ID
          agent_id,
          conversation_id,
          messages: allMessages
        }, {
          conversation_end_timestamp: timestamp,
          total_messages: allMessages.length,
          // Optional: Store therapeutic context
          therapeutic_session: user_metadata?.therapy_stage || 'general',
          session_type: user_metadata?.session_type || 'check_in'
        });

        console.log('💾 Conversation memory added with custom user ID');
      }
    } else if (message_type === 'user_message' || message_type === 'agent_response') {
      console.log(`💬 Processing ${message_type}`);
      
      // Firebase works perfectly with custom user ID
      await firebaseMemoryManager.saveConversationMemory(customUserId, conversationData);
      
      if (message_type === 'user_message') {
        // Mem0 search works perfectly with custom user ID
        const relevantMemories = await mem0Service.searchMemories(customUserId, message, 3);
        
        if (relevantMemories.results && relevantMemories.results.length > 0) {
          console.log('🧠 Found relevant memories for custom user');
        }
      }
    }

    // Return success with user ID confirmation
    res.status(200).json({ 
      success: true, 
      processed: true,
      user_id: customUserId,  // Confirm which user ID was used
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
