// api/memory/search.js
import mem0Service from '../../lib/mem0Service.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, query, limit = 5 } = req.body;

    if (!userId || !query) {
      return res.status(400).json({ error: 'userId and query are required' });
    }

    const memories = await mem0Service.searchMemories(userId, query, limit);
    
    res.status(200).json({
      success: true,
      memories: memories.results || [],
      total: memories.results ? memories.results.length : 0
    });

  } catch (error) {
    console.error('Memory search error:', error);
    res.status(500).json({ 
      error: 'Failed to search memories',
      message: error.message 
    });
  }
}
