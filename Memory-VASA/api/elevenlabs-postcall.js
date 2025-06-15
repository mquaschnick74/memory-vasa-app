// api/elevenlabs-postcall.js
// Store real VASA conversations in Mem0 - fixed import

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
      console.log('💾 Processing REAL conversation for Mem0 storage...');
      
      // Convert transcript to readable format
      const conversationText = transcript.map((entry, index) => {
        const role = entry.role === 'agent' ? 'VASA' : 'User';
        const content = entry.content || entry.message || 'No content';
        return `${role}: ${content}`;
      }).join('\n');
      
      console.log('📝 REAL Conversation content:', conversationText.substring(0, 300) + '...');
      
      // Use the same mem0 approach as your working endpoints
      // Import mem0 client directly like your other working files do
      const { MemoryClient } = await import('mem0ai');
      
      const mem0 = new MemoryClient({
        apiKey: process.env.MEM0_API_KEY
      });
      
      console.log('🔗 Mem0 client created, storing conversation...');
      
      // Store the real conversation
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
          transcript_length: transcript.length,
          type: 'voice_conversation_real'
        }
      });
      
      console.log('✅ REAL conversation stored in Mem0!', {
        memory_id: memoryResult?.id,
        conversation_id: conversation_id,
        content_length: conversationText.length,
        memories_created: memoryResult?.results?.length
      });
      
      // Also store summary if available
      if (analysis?.transcript_summary) {
        console.log('💾 Storing conversation summary...');
        
        const summaryResult = await mem0.add({
          messages: [{
            role: 'assistant',
            content: `Conversation summary: ${analysis.transcript_summary}`
          }],
          user_id: userUUID,
          metadata: {
            source: 'elevenlabs_conversation_summary',
            conversation_id: conversation_id,
            type: 'conversation_summary',
            timestamp: new Date().toISOString()
          }
        });
        
        console.log('✅ Conversation summary also stored:', summaryResult?.id);
      }
      
      res.status(200).json({
        success: true,
        message: 'REAL conversation stored in Mem0 successfully!',
        details: {
          memory_id: memoryResult?.id,
          conversation_id: conversation_id,
          stored_content_length: conversationText.length,
          transcript_entries: transcript.length,
          memories_created: memoryResult?.results?.length || 1
        }
      });
      
    } catch (memoryError) {
      console.error('❌ Error storing conversation in Mem0:', memoryError);
      
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
