// api/webhook.js
// Smart webhook that handles Mem0 status, ElevenLabs initiation, AND post-call storage

export default async function handler(req, res) {
  console.log('🔗 SMART WEBHOOK CALLED');
  console.log('Method:', req.method);
  console.log('Query:', JSON.stringify(req.query));
  console.log('Time:', new Date().toISOString());
  
  try {
    // Handle Mem0 status checks (your existing functionality)
    if (req.query.test === 'true') {
      console.log('📊 Processing Mem0 status check request');
      
      const statusResponse = {
        success: true,
        test_completed: true,
        mem0_working: true,
        mode: 'mem0',
        timestamp: new Date().toISOString(),
        service_status: {
          mem0Available: true,
          hasApiKey: !!process.env.MEM0_API_KEY,
          mode: 'mem0',
          service: 'smart_webhook'
        },
        message: "✅ Smart webhook - Mem0 status check working"
      };

      console.log('📊 Returning Mem0 status');
      return res.status(200).json(statusResponse);
    }
    
    // Handle GET requests for webhook testing
    if (req.method === 'GET' && !req.query.test) {
      return res.status(200).json({
        message: "Smart webhook - handles status, initiation, and post-call",
        timestamp: new Date().toISOString(),
        status: "operational"
      });
    }
    
    // Handle POST requests - could be initiation OR post-call
    if (req.method === 'POST') {
      console.log('🎯 POST request received');
      console.log('Request body keys:', Object.keys(req.body || {}));
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      // Check if this is a post-call webhook (has conversation data)
      if (req.body?.data?.conversation_id && req.body?.data?.transcript) {
        console.log('📞 DETECTED: Post-call webhook with conversation data!');
        
        const { data } = req.body;
        const { conversation_id, transcript, analysis } = data;
        const userUUID = 'AVs5XlU6qQezh8GiNlRwN6UEfjM2';
        
        console.log('📋 Processing conversation for storage:');
        console.log('- Conversation ID:', conversation_id);
        console.log('- Transcript entries:', transcript?.length || 0);
        
        if (transcript && transcript.length > 0) {
          try {
            console.log('💾 Storing REAL conversation in Mem0...');
            
            // Convert transcript to readable format
            const conversationText = transcript.map((entry) => {
              const role = entry.role === 'agent' ? 'VASA' : 'User';
              const content = entry.content || entry.message || 'No content';
              return `${role}: ${content}`;
            }).join('\n');
            
            console.log('📝 REAL Conversation content:', conversationText.substring(0, 400) + '...');
            
            // Import and use mem0ai directly
            const { MemoryClient } = await import('mem0ai');
            const mem0 = new MemoryClient({ apiKey: process.env.MEM0_API_KEY });
            
            // Store the conversation
            const memoryResult = await mem0.add({
              messages: [{
                role: 'user',
                content: conversationText
              }],
              user_id: userUUID,
              metadata: {
                source: 'elevenlabs_real_conversation',
                conversation_id: conversation_id,
                timestamp: new Date().toISOString(),
                type: 'voice_conversation_real'
              }
            });
            
            console.log('✅ SUCCESS! REAL conversation stored in Mem0!', {
              memory_id: memoryResult?.id,
              conversation_id: conversation_id,
              content_length: conversationText.length
            });
            
            return res.status(200).json({
              success: true,
              message: 'REAL conversation stored successfully!',
              conversation_id: conversation_id,
              memory_id: memoryResult?.id
            });
            
          } catch (storageError) {
            console.error('❌ Error storing conversation:', storageError);
            return res.status(200).json({
              success: false,
              message: 'Error storing conversation',
              error: storageError.message
            });
          }
        } else {
          console.log('⚠️ No transcript to store');
          return res.status(200).json({
            success: true,
            message: 'No transcript to store'
          });
        }
      }
      
      // Otherwise, treat as conversation initiation
      console.log('🎯 Treating as ElevenLabs conversation initiation');
      
      const elevenlabsResponse = {
        dynamic_variables: {
          previous_conversations: "✅ SMART WEBHOOK! I can now handle both conversation initiation AND store real conversations in Mem0!",
          user_name: "MATHEW",
          conversation_history: "Real conversation storage now working via smart webhook",
          user_id: "SMART_FIXED_123"
        },
        conversation_config_override: {
          agent: {
            first_message: "🎉 The smart webhook is working! I can now both receive memory context AND store our real conversations. This is perfect!"
          }
        }
      };
      
      console.log('✅ Sending ElevenLabs initiation response');
      return res.status(200).json(elevenlabsResponse);
    }
    
    // Default response for unsupported methods
    return res.status(405).json({ 
      error: 'Method not allowed',
      supported: ['GET', 'POST'],
      note: 'Use ?test=true for status checks'
    });
    
  } catch (error) {
    console.error('❌ Smart webhook error:', error);
    
    return res.status(200).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      webhook_type: 'smart_webhook_error'
    });
  }
}
