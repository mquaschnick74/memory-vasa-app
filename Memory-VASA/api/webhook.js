// api/webhook.js
// ElevenLabs conversation initiation webhook at expected endpoint

export default async function handler(req, res) {
  console.log('🔗 ELEVENLABS WEBHOOK CALLED AT /api/webhook');
  console.log('Method:', req.method);
  console.log('Time:', new Date().toISOString());
  console.log('Headers:', JSON.stringify(req.headers));
  console.log('Body:', JSON.stringify(req.body));
  
  // Handle GET requests for testing
  if (req.method === 'GET') {
    return res.status(200).json({
      message: "ElevenLabs webhook endpoint is working!",
      timestamp: new Date().toISOString(),
      endpoint: "/api/webhook"
    });
  }
  
  // Handle POST requests from ElevenLabs
  try {
    console.log('🎯 Processing ElevenLabs conversation initiation request');
    
    const obviousResponse = {
      dynamic_variables: {
        previous_conversations: "🚀 BREAKTHROUGH! The ElevenLabs webhook is now calling the correct endpoint (/api/webhook) and injecting real memory context!",
        user_name: "MATHEW_WEBHOOK",
        conversation_history: "🔧 Successfully connected ElevenLabs to memory system via correct webhook endpoint",
        user_id: "WORKING_123"
      },
      conversation_config_override: {
        agent: {
          first_message: "🎉 MAJOR SUCCESS! The webhook integration is working! ElevenLabs is calling /api/webhook and I'm receiving dynamic variables. The memory system is connected!"
        }
      }
    };
    
    console.log('✅ SENDING OBVIOUS SUCCESS RESPONSE TO ELEVENLABS');
    console.log('Response:', JSON.stringify(obviousResponse, null, 2));
    
    res.status(200).json(obviousResponse);
    
  } catch (error) {
    console.error('❌ ElevenLabs webhook error:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
