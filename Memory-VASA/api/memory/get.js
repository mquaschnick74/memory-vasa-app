// api/memory/get.js
import mem0Service from '../../lib/mem0Service.js';
import firebaseMemoryManager from '../../lib/firebaseMemoryManager.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, source = 'both' } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    let memories = {};

    if (source === 'mem0' || source === 'both') {
      memories.mem0 = await mem0Service.getMemories(userId);
    }

    if (source === 'firebase' || source === 'both') {
      memories.firebase = await firebaseMemoryManager.getUserMemories(userId);
    }

    res.status(200).json({
      success: true,
      memories,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get memories error:', error);
    res.status(500).json({ 
      error: 'Failed to get memories',
      message: error.message 
    });
  }
}
