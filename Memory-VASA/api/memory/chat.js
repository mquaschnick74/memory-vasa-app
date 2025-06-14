// api/memory/chat.js - Optimized version to avoid timeouts
import mem0Service from '../../lib/mem0Service.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, message } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message are required' });
    }

    console.log(`💬 Processing chat request for user: ${userId}`);
    console.log(`💬 Message: ${message}`);

    // Search for relevant memories (with shorter timeout)
    const relevantMemories = await Promise.race([
      mem0Service.searchMemories(userId, message, 3),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Search timeout')), 8000))
    ]);
    
    console.log(`🧠 Found ${relevantMemories.results?.length || 0} relevant memories`);

    // Generate contextual response (with shorter timeout)  
    const response = await Promise.race([
      mem0Service.generateContextualResponse(userId, message, relevantMemories),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Response timeout')), 15000))
    ]);

    console.log(`🤖 Generated response length: ${response?.length || 0} characters`);

    // Add this interaction to memory (async, don't wait)
    setTimeout(async () => {
      try {
        await mem0Service.addMemory(userId, {
          messages: [
            { role: 'user', content: message },
            { role: 'assistant', content: response }
          ]
        }, {
          api_interaction: true,
          timestamp: new Date().toISOString()
        });
        console.log('💾 Chat interaction added to memory');
      } catch (error) {
        console.error('⚠️ Failed to add chat interaction to memory:', error.message);
      }
    }, 100);

    res.status(200).json({
      success: true,
      response,
      memoriesUsed: relevantMemories.results ? relevantMemories.results.length : 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Memory chat error:', error);
    
    // If it's a timeout, return a helpful fallback response
    if (error.message.includes('timeout')) {
      return res.status(200).json({
        success: true,
        response: `I understand you're asking about "${req.body.message}". I'm having trouble accessing your memory data right now due to a timeout, but I'm here to help. Could you tell me more about what you'd like to discuss?`,
        memoriesUsed: 0,
        note: 'Timeout occurred - using fallback response'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to process chat',
      message: error.message 
    });
  }
}
