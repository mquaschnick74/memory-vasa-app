// api/conversation-initiation-webhook.js
// Ultra-obvious webhook response for debugging

export default async function handler(req, res) {
  console.log('🔗 WEBHOOK CALLED!');
  console.log('Method:', req.method);
  console.log('Time:', new Date().toISOString());
  
  // Handle GET requests for testing
  if (req.method === 'GET') {
    return res.status(200).json({
      message: "WEBHOOK IS WORKING - GET REQUEST",
      timestamp: new Date().toISOString(),
      method: "GET"
    });
  }
  
  // Handle POST requests from ElevenLabs - make response very obvious
  try {
    const obviousResponse = {
      dynamic_variables: {
        previous_conversations: "🚀 WEBHOOK WORKING! This message proves the ElevenLabs webhook integration is active and injecting memory context successfully!",
        user_name: "WEBHOOK_USER",
        conversation_history: "🔧 This is live webhook data, not test data",
        user_id: "WEBHOOK_123"
      },
      conversation_config_override: {
        agent: {
          first_message: "🎉 SUCCESS! The webhook is working! I'm receiving dynamic variables from the conversation initiation webhook. This proves the memory integration is functional!"
        }
      }
    };
    
    console.log('✅ RETURNING OBVIOUS WEBHOOK DATA');
    console.log('Data:', JSON.stringify(obviousResponse, null, 2));
    
    res.status(200).json(obviousResponse);
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
}
