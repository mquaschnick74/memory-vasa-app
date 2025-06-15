// api/elevenlabs-postcall.js
// Store real VASA conversations in Mem0 after they end

export default async function handler(req, res) {
  console.log('📞 POST-CALL WEBHOOK: Real conversation ended');
  console.log('Method:', req.method);
  console.log('Time:', new Date().toISOString());
  
  try {
    const { data } = req.body;
    
    if (!data) {
      console.log('⚠️ No conversation data received');
      return res.status(200).json({ success: false, message: 'No data received' });
    }
    
    // Extract conversation details
    const {
      conversation_id,
      transcript,
      analysis,
      metadata
    } = data;
    
    console.log('📋 Conversation details:');
    console.log('- Conversation ID:', conversation_id);
    console.log('- Transcript entries:', transcript?.length || 0);
    console.log('- Analysis available:', !!analysis);
    
    // Your user ID
    const userUUID = 'AVs5XlU6qQezh8GiNlRwN6UEfjM2';
    
    if (!transcript || transcript.length === 0) {
      console.log('⚠️ No transcript - conversation too short or failed');
      return res.status(200).json({ success: true, message: 'No transcript to store' });
    }
    
    try {
      console.log('💾 Storing REAL conversation in Mem0...');
      
      // Convert transcript to readable format
      const conversationText = transcript.map((entry, index) => {
        const role = entry.role === 'agent' ? 'VASA' : 'User';
        const content = entry.content || entry.message || 'No content';
        return `${role}: ${content}`;
      }).join('\n');
      
      console.log('📝 Conversation preview:', conversationText.substring(0, 200) + '...');
      
      // Store conversation using simple fetch to your existing Mem0 API
      const memoryPayload = {
        text: conversationText,
        user_id: userUUID,
        metadata: {
          source: 'elevenlabs_real_conversation',
          conversation_id: conversation_id,
          timestamp: new Date().toISOString(),
          transcript_length: transcript.length,
          type: 'voice_conversation_real'
        }
      };
      
      // Call your existing Mem0 API endpoint
      const memoryResponse = await fetch('https://www.ivasa-ai.com/api/add-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memoryPayload)
      });
      
      const memoryResult = await memoryResponse.json();
      
      if (memoryResult.success) {
        console.log('✅ REAL conversation stored in Mem0:', {
          memory_id: memoryResult.memory_id,
          conversation_id: conversation_id,
          content_length: conversationText.length
        });
        
        // Also store summary if available
        if (analysis?.transcript_summary) {
          const summaryPayload = {
            text: `Conversation summary: ${analysis.transcript_summary}`,
            user_id: userUUID,
            metadata: {
              source: 'elevenlabs_conversation_summary',
              conversation_id: conversation_id,
              type: 'conversation_summary'
            }
          };
          
          await fetch('https://www.ivasa-ai.com/api/add-memory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(summaryPayload)
          });
          
          console.log('✅ Conversation summary also stored');
        }
        
        res.status(200).json({
          success: true,
          message: 'REAL conversation stored in Mem0 successfully',
          details: {
            memory_id: memoryResult.memory_id,
            conversation_id: conversation_id,
            stored_content_length: conversationText.length,
            transcript_entries: transcript.length
          }
        });
        
      } else {
        console.error('❌ Failed to store in Mem0:', memoryResult);
        throw new Error('Mem0 storage failed: ' + memoryResult.error);
      }
      
    } catch (memoryError) {
      console.error('❌ Error storing conversation:', memoryError);
      
      // Still return 200 to prevent ElevenLabs from disabling webhook
      res.status(200).json({
        success: false,
        message: 'Error storing conversation in Mem0',
        error: memoryError.message,
        conversation_id: conversation_id
      });
    }
    
  } catch (error) {
    console.error('❌ Post-call webhook error:', error);
    
    // Always return 200 to prevent webhook from being disabled
    res.status(200).json({
      success: false,
      message: 'Post-call webhook processing error',
      error: error.message
    });
  }
}
