// api/conversation-initiation-webhook.js
// ElevenLabs conversation initiation webhook that injects memory context

import { mem0Service } from '../lib/mem0Service.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  console.log('🔗 ElevenLabs conversation initiation webhook called');
  
  try {
    // Optional: Verify webhook signature for security
    const signature = req.headers['elevenlabs-signature'] || req.headers['x-webhook-secret'];
    if (signature && process.env.ELEVENLABS_WEBHOOK_SECRET) {
      // Verify HMAC signature here if needed
      console.log('🔐 Webhook signature present, verification can be added');
    }
    
    // ElevenLabs sends conversation initiation data
    const { caller_id, agent_id, call_sid } = req.body;
    
    // Extract user ID (you might need to map this from caller_id)
    const userUUID = 'AVs5XlU6qQezh8GiNlRwN6UEfjM2'; // Your user ID
    
    console.log('🧠 Fetching memory context for user:', userUUID);
    
    // Get user's memory context from Mem0
    let memoryContext = '';
    let conversationHistory = '';
    
    try {
      // Get conversation context
      const contextResponse = await fetch(`https://www.ivasa-ai.com/api/get-conversation-context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userUUID,
          limit: 10
        })
      });
      
      const contextResult = await contextResponse.json();
      
      if (contextResult.success) {
        memoryContext = contextResult.context_summary || 'No previous conversation context available.';
        conversationHistory = contextResult.context?.map(c => c.text).join(' ') || '';
        
        console.log('✅ Memory context loaded:', memoryContext.substring(0, 100) + '...');
      } else {
        console.log('⚠️ No memory context found, using fallback');
        memoryContext = 'This is your first conversation with this user.';
      }
    } catch (error) {
      console.error('❌ Error fetching memory context:', error);
      memoryContext = 'Memory system temporarily unavailable.';
    }
    
    // Return conversation initiation data with memory context as dynamic variables
    const initiationData = {
      dynamic_variables: {
        previous_conversations: memoryContext,
        user_name: 'User', // You can get this from your user system
        conversation_history: conversationHistory,
        user_id: userUUID
      },
      conversation_config_override: {
        agent: {
          first_message: `Hello! I remember our previous conversations. ${memoryContext.includes('first conversation') ? "It's great to meet you!" : "It's good to talk with you again!"}`
        }
      }
    };
    
    console.log('🚀 Sending memory context to ElevenLabs:', {
      memoryContextLength: memoryContext.length,
      hasHistory: conversationHistory.length > 0,
      dynamicVariables: Object.keys(initiationData.dynamic_variables)
    });
    
    res.status(200).json(initiationData);
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    
    // Return fallback data if error
    res.status(200).json({
      dynamic_variables: {
        previous_conversations: 'Memory system temporarily unavailable.',
        user_name: 'User',
        conversation_history: '',
        user_id: 'unknown'
      }
    });
  }
}
