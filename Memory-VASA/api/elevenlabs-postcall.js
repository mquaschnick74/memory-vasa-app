// api/elevenlabs-postcall.js
// Store real VASA conversations in Mem0 - FULL DEBUG VERSION

export default async function handler(req, res) {
  console.log('🚨 POST-CALL WEBHOOK TRIGGERED!');
  console.log('Method:', req.method);
  console.log('Time:', new Date().toISOString());
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Raw Body:', JSON.stringify(req.body, null, 2));
  
  try {
    // Check if this is the right HTTP method
    if (req.method !== 'POST') {
      console.log('❌ Wrong method - expected POST, got:', req.method);
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    console.log('✅ POST method confirmed');
    
    // Check if we have any body at all
    if (!req.body) {
      console.log('❌ No request body received');
      return res.status(200).json({ success: false, message: 'No request body' });
    }
    
    console.log('✅ Request body exists');
    
    // Log the complete structure
    console.log('📋 Complete request body structure:');
    console.log(JSON.stringify(req.body, null, 2));
    
    const { data } = req.body;
    
    if (!data) {
      console.log('❌ No "data" field in request body');
      console.log('Available fields:', Object.keys(req.body));
      return res.status(200).json({ success: false, message: 'No data field received' });
    }
    
    console.log('✅ Data field exists');
    
    // Extract conversation details
    const {
      conversation_id,
      transcript,
      analysis,
      metadata
    } = data;
    
    console.log('📋 Detailed conversation data:');
    console.log('- Conversation ID:', conversation_id);
    console.log('- Transcript:', transcript);
    console.log('- Transcript type:', typeof transcript);
    console.log('- Transcript length:', Array.isArray(transcript) ? transcript.length : 'not array');
    console.log('- Analysis:', analysis);
    console.log('- Metadata:', metadata);
    
    // Your user ID
    const userUUID = 'AVs5XlU6qQezh8GiNlRwN6UEfjM2';
    console.log('✅ User UUID:', userUUID);
    
    if (!transcript) {
      console.log('❌ Transcript is null/undefined');
      return res.status(200).json({ success: true, message: 'No transcript provided' });
    }
    
    if (!Array.isArray(transcript)) {
      console.log('❌ Transcript is not an array, it is:', typeof transcript);
      return res.status(200).json({ success: true, message: 'Transcript is not an array' });
    }
    
    if (transcript.length === 0) {
      console.log('❌ Transcript array is empty');
      return res.status(200).json({ success: true, message: 'Transcript array is empty' });
    }
    
    console.log('✅ Transcript validation passed');
    
    try {
      console.log('💾 Starting Mem0 storage process...');
      
      // Convert transcript to readable format
      console.log('📝 Processing transcript entries...');
      const conversationText = transcript.map((entry, index) => {
        console.log(`Entry ${index}:`, entry);
        const role = entry.role === 'agent' ? 'VASA' : 'User';
        const content = entry.content || entry.message || entry.text || 'No content';
        const formatted = `${role}: ${content}`;
        console.log(`Formatted entry ${index}:`, formatted);
        return formatted;
      }).join('\n');
      
      console.log('✅ Conversation text created:');
      console.log('Length:', conversationText.length);
      console.log('Content preview:', conversationText.substring(0, 500));
      
      // Check environment variable
      if (!process.env.MEM0_API_KEY) {
        console.log('❌ MEM0_API_KEY environment variable not found!');
        return res.status(200).json({ success: false, message: 'MEM0_API_KEY not configured' });
      }
      
      console.log('✅ MEM0_API_KEY exists (length:', process.env.MEM0_API_KEY.length, ')');
      
      // Import mem0 client
      console.log('📦 Importing Mem0 client...');
      const { MemoryClient } = await import('mem0ai');
      console.log('✅ Mem0 imported successfully');
      
      const mem0 = new MemoryClient({
        apiKey: process.env.MEM0_API_KEY
      });
      console.log('✅ Mem0 client created');
      
      // Prepare metadata
      const metadata = {
        source: 'elevenlabs_real_conversation',
        conversation_id: conversation_id,
        timestamp: new Date().toISOString(),
        transcript_length: transcript.length,
        type: 'voice_conversation_real'
      };
      
      console.log('📋 Metadata prepared:', metadata);
      
      // Make the Mem0 API call
      console.log('🔄 Making Mem0 API call...');
      console.log('Parameters:');
      console.log('- Content:', conversationText.substring(0, 100) + '...');
      console.log('- User ID:', userUUID);
      console.log('- Metadata:', metadata);
      
      const memoryResult = await mem0.add(
        conversationText,
        userUUID,
        metadata
      );
      
      console.log('🎉 MEM0 API CALL SUCCESSFUL!');
      console.log('Result:', JSON.stringify(memoryResult, null, 2));
      
      // Also store summary if available
      if (analysis?.transcript_summary) {
        console.log('💾 Storing conversation summary...');
        
        const summaryMetadata = {
          source: 'elevenlabs_conversation_summary',
          conversation_id: conversation_id,
          type: 'conversation_summary',
          timestamp: new Date().toISOString()
        };
        
        const summaryResult = await mem0.add(
          `Conversation summary: ${analysis.transcript_summary}`,
          userUUID,
          summaryMetadata
        );
        
        console.log('✅ Conversation summary stored:', JSON.stringify(summaryResult, null, 2));
      }
      
      const response = {
        success: true,
        message: 'REAL conversation stored in Mem0 successfully!',
        details: {
          memory_id: memoryResult?.id,
          conversation_id: conversation_id,
          stored_content_length: conversationText.length,
          transcript_entries: transcript.length,
          timestamp: new Date().toISOString()
        }
      };
      
      console.log('✅ Sending success response:', response);
      res.status(200).json(response);
      
    } catch (memoryError) {
      console.error('❌ MEMORY ERROR OCCURRED:');
      console.error('Error name:', memoryError.name);
      console.error('Error message:', memoryError.message);
      console.error('Error stack:', memoryError.stack);
      console.error('Full error object:', JSON.stringify(memoryError, null, 2));
      
      // Still return 200 to prevent ElevenLabs from disabling webhook
      const errorResponse = {
        success: false,
        message: 'Error storing conversation in Mem0',
        error: memoryError.message,
        conversation_id: conversation_id,
        timestamp: new Date().toISOString()
      };
      
      console.log('❌ Sending error response:', errorResponse);
      res.status(200).json(errorResponse);
    }
    
  } catch (error) {
    console.error('❌ GENERAL WEBHOOK ERROR:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    
    // Always return 200 to prevent webhook from being disabled
    const errorResponse = {
      success: false,
      message: 'Post-call webhook processing error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
    
    console.log('❌ Sending general error response:', errorResponse);
    res.status(200).json(errorResponse);
  }
}
