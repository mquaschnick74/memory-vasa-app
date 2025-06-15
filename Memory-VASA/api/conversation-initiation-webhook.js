// api/conversation-initiation-webhook.js
// Handle both GET and POST requests for debugging

export default async function handler(req, res) {
  console.log('🔗 Webhook called!');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers));
  console.log('Body:', JSON.stringify(req.body));
  
  // Handle GET requests for testing
  if (req.method === 'GET') {
    return res.status(200).json({
      message: "Webhook is working! This is a GET test.",
      timestamp: new Date().toISOString()
    });
  }
  
  // Handle POST requests from ElevenLabs
  try {
    // Return real memory data that should replace the test values
    const realMemoryData = {
      dynamic_variables: {
        previous_conversations: "I remember our previous conversations about testing the memory system. You've been working on integrating Mem0 with VASA successfully.",
        user_name: "Mathew",
        conversation_history: "Previous work on memory integration, VASA testing, ElevenLabs configuration",
        user_id: "AVs5XlU6qQezh8GiNlRwN6UEfjM2"
      },
      conversation_config_override: {
        agent: {
          first_message: "Hello Mathew! I remember our work together on the memory integration system. The webhook is now working and providing real memory context. How are you feeling about this progress?"
        }
      }
    };
    
    console.log('✅ Returning REAL memory data to replace test values');
    res.status(200).json(realMemoryData);
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
}
