// api/memory/chat.js
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

    // Search for relevant memories
    const relevantMemories = await mem0Service.searchMemories(userId, message, 3);
    
    // Generate contextual response
    const response = await mem0Service.generateContextualResponse(
      userId, 
      message, 
      relevantMemories
    );

    // Add this interaction to memory
    await mem0Service.addMemory(userId, {
      messages: [
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      ]
    }, {
      api_interaction: true,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      response,
      memoriesUsed: relevantMemories.results ? relevantMemories.results.length : 0
    });

  } catch (error) {
    console.error('Memory chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat',
      message: error.message 
    });
  }
}
