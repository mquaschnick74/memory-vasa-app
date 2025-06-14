// api/webhook.js - Enhanced with Mem0 integration
import crypto from 'crypto';
import mem0Service from '../lib/mem0Service.js';
import firebaseMemoryManager from '../lib/firebaseMemoryManager.js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify webhook signature
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

    // Create conversation data object
    const conversationData = {
      agent_id,
      conversation_id,
      user_id,
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

    // Process memory based on message type
    if (message_type === 'conversation_end') {
      console.log('🔚 Processing conversation end');
      
      // Get full conversation history from Firebase
      const conversationHistory = await firebaseMemoryManager.getConversationHistory(
        user_id, 
        conversation_id
      );

      if (conversationHistory.length > 0) {
        // Convert Firebase history to messages format for Mem0
        const allMessages = conversationHistory.flatMap(entry => entry.messages || []);
        
        // Add comprehensive memory to Mem0
        await mem0Service.addMemory(user_id, {
          agent_id,
          conversation_id,
          messages: allMessages
        }, {
          conversation_end_timestamp: timestamp,
          total_messages: allMessages.length,
          conversation_duration: calculateConversationDuration(conversationHistory)
        });

        console.log('💾 Conversation memory added to Mem0');
      }
    } else if (message_type === 'user_message' || message_type === 'agent_response') {
      console.log(`💬 Processing ${message_type}`);
      
      // Save individual message to Firebase for immediate access
      await firebaseMemoryManager.saveConversationMemory(user_id, conversationData);
      
      // For user messages, also search relevant memories and potentially add context
      if (message_type === 'user_message') {
        // Search for relevant memories
        const relevantMemories = await mem0Service.searchMemories(user_id, message, 3);
        
        if (relevantMemories.results && relevantMemories.results.length > 0) {
          console.log('🧠 Found relevant memories:', relevantMemories.results.length);
          
          // You could use this to enhance the agent's response
          // This would require integration with your 11 Labs agent setup
        }
      }
    }

    // Return success response
    res.status(200).json({ 
      success: true, 
      processed: true,
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

function calculateConversationDuration(conversationHistory) {
  if (conversationHistory.length < 2) return 0;
  
  const startTime = new Date(conversationHistory[0].createdAt);
  const endTime = new Date(conversationHistory[conversationHistory.length - 1].createdAt);
  
  return Math.round((endTime - startTime) / 1000); // Duration in seconds
}
