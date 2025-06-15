// api/elevenlabs-postcall.js
// Store real VASA conversations in Mem0 - corrected API format

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
      
      // Import mem0 client
      const { MemoryClient } = await import('mem0ai');
      const mem0 = new MemoryClient({
        apiKey: process.env.MEM0_API_KEY
      });
      
      console.log('🔗 Mem0 client created, storing conversation with simple format...');
      
      // Use simple text-based format instead of messages format
      const memoryResult = await mem0.add(
        conversationText,  // Just pass the text directly
        userUUID,         // User ID as second parameter
        {                 // Metadata as third parameter
          source: 'elevenlabs_real_conversation',
          conversation_id: conversation_id,
          timestamp: new Date().toISOString(),
          transcript_length: transcript.length,
          type: 'voice_conversation_real'
        }
      );
      
      console.log('✅ SUCCESS! REAL conversation stored in Mem0!', {
        memory_id: memoryResult?.id,
        conversation_id: conversation_id,
        content_length: conversationText.length,
        result: memoryResult
      });
      
      // Also store summary if available
      if (analysis?.transcript_summary) {
        console.log('💾 Storing conversation summary...');
        
        const summaryResult = await mem0.add(
          `Conversation summary: ${analysis.transcript_summary}`,
          userUUID,
          {
            source: 'elevenlabs_conversation_summary',
            conversation_id: conversation_id,
            type: 'conversation_summary',
            timestamp: new Date().toISOString()
          }
        );
        
        console.log('✅ Conversation summary also stored:', summaryResult?.id);
      }
      
      res.status(200).json({
        success: true,
        message: 'REAL conversation stored in Mem0 successfully!',
        details: {
          memory_id: memoryResult?.id,
          conversation_id: conversation_id,
          stored_content_length: conversationText.length,
          transcript_entries: transcript.length
        }
      });
      
    } catch (memoryError) {
      console.error('❌ Error storing conversation in Mem0:', memoryError);
      console.error('Error details:', {
        name: memoryError.name,
        message: memoryError.message,
        stack: memoryError.stack
      });
      
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
