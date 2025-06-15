// api/elevenlabs-postcall.js (or api/webhook.js)
// Receives real VASA conversations from ElevenLabs and stores them in Mem0

import { mem0Service } from '../lib/mem0Service.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  console.log('📞 ElevenLabs post-call webhook - REAL conversation data received');
  
  try {
    // Optional: Verify webhook signature for security
    const signature = req.headers['elevenlabs-signature'] || req.headers['x-webhook-secret'];
    if (signature && process.env.ELEVENLABS_WEBHOOK_SECRET) {
      // Verify HMAC signature here if needed
      console.log('🔐 Webhook signature present, verification can be added');
    }
    
    const { data } = req.body;
    
    if (!data) {
      console.log('⚠️ No data in webhook payload');
      return res.status(200).json({ success: false, message: 'No data received' });
    }
    
    // Extract conversation details
    const {
      conversation_id,
      transcript,
      analysis,
      metadata
    } = data;
    
    console.log('🔍 Conversation details:');
    console.log('- Conversation ID:', conversation_id);
    console.log('- Transcript entries:', transcript?.length || 0);
    console.log('- Analysis available:', !!analysis);
    console.log('- Metadata:', metadata);
    
    // Your user ID (you might want to extract this from dynamic variables later)
    const userUUID = 'AVs5XlU6qQezh8GiNlRwN6UEfjM2';
    
    if (!transcript || transcript.length === 0) {
      console.log('⚠️ No transcript available - conversation may have been too short');
      return res.status(200).json({ success: true, message: 'No transcript to store' });
    }
    
    try {
      console.log('💾 Processing transcript for Mem0 storage...');
      
      // Convert transcript to readable format
      const conversationText = transcript.map((entry, index) => {
        const role = entry.role === 'agent' ? 'VASA' : 'User';
        return `${role}: ${entry.content}`;
      }).join('\n');
      
      console.log('📝 Formatted conversation:', conversationText.substring(0, 200) + '...');
      
      // Store in Mem0 with metadata
      const memoryResult = await mem0Service.addMemory(
        conversationText,
        userUUID,
        {
          source: 'elevenlabs_voice_conversation',
          conversation_id: conversation_id,
          timestamp: new Date().toISOString(),
          transcript_length: transcript.length,
          call_successful: analysis?.call_successful,
          summary: analysis?.transcript_summary,
          type: 'real_voice_conversation'
        }
      );
      
      console.log('✅ REAL conversation stored in Mem0:', {
        memory_id: memoryResult?.id,
        user_id: userUUID,
        conversation_id: conversation_id,
        stored_content_length: conversationText.length
      });
      
      // Also store conversation summary if available
      if (analysis?.transcript_summary) {
        const summaryResult = await mem0Service.addMemory(
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
      
      // Success response
      res.status(200).json({
        success: true,
        message: 'Real VASA conversation stored in Mem0 successfully',
        details: {
          memory_id: memoryResult?.id,
          user_id: userUUID,
          conversation_id: conversation_id,
          transcript_entries: transcript.length,
          stored_in_mem0: true
        }
      });
      
    } catch (memoryError) {
      console.error('❌ Error storing conversation in Mem0:', memoryError);
      
      // Still return 200 to ElevenLabs to prevent webhook from being disabled
      res.status(200).json({
        success: false,
        message: 'Error storing conversation in Mem0',
        error: memoryError.message,
        conversation_id: conversation_id
      });
    }
    
  } catch (error) {
    console.error('❌ Post-call webhook processing error:', error);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    
    // Always return 200 to prevent ElevenLabs from disabling the webhook
    res.status(200).json({
      success: false,
      message: 'Webhook processing error',
      error: error.message
    });
  }
}
