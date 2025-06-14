// api/webhook.js - Updated with built-in test mode
import mem0Service from '../lib/mem0Service.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // **NEW: TEST MODE - if URL has ?test=true**
  if (req.query.test === 'true' || req.method === 'GET') {
    return await runMem0Test(req, res);
  }

  // Regular webhook processing
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, conversationData, action = 'add', message, query, limit } = req.body;
    
    console.log(`📥 Webhook received - Action: ${action}, User: ${userId}`);
    
    switch (action) {
      case 'add':
        if (!userId || !conversationData) {
          return res.status(400).json({ error: 'Missing userId or conversationData' });
        }
        
        const memoryResult = await mem0Service.addMemory(userId, conversationData);
        console.log('✅ Memory added via webhook:', memoryResult);
        
        return res.status(200).json({
          success: true,
          message: 'Memory added successfully',
          memory: memoryResult,
          mode: memoryResult.mode || 'unknown'
        });
        
      case 'search':
        const searchResults = await mem0Service.searchMemories(userId, query, limit || 5);
        return res.status(200).json({
          success: true,
          memories: searchResults
        });
        
      case 'context':
        const memories = await mem0Service.searchMemories(userId, message, 5);
        const contextualResponse = await mem0Service.generateContextualResponse(
          userId, 
          message, 
          memories
        );
        
        return res.status(200).json({
          success: true,
          response: contextualResponse,
          memories_used: memories.results?.length || memories.memories?.length || 0
        });
        
      default:
        return res.status(400).json({ error: `Invalid action: ${action}` });
    }
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// **NEW: Built-in test function**
async function runMem0Test(req, res) {
  const results = [];
  
  function log(message, data = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      data: data ? JSON.stringify(data, null, 2) : null
    };
    results.push(logEntry);
    console.log(message, data);
  }

  try {
    log('🧪 Starting Mem0 Test via Webhook');
    
    // Check environment variables
    log('1️⃣ Environment Check');
    const envCheck = {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      MEM0_API_KEY: !!process.env.MEM0_API_KEY,
      NODE_ENV: process.env.NODE_ENV || 'unknown'
    };
    log('Environment status', envCheck);
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY missing - add it in Vercel environment variables');
    }
    
    if (!process.env.MEM0_API_KEY) {
      throw new Error('MEM0_API_KEY missing - get it from https://app.mem0.ai/dashboard/api-keys and add to Vercel env vars');
    }
    
    // Test mem0Service status
    log('2️⃣ Testing mem0Service status');
    const serviceStatus = mem0Service.getStatus();
    log('Service status', serviceStatus);
    
    // Test actual memory operations
    log('3️⃣ Testing memory operations');
    const testUserId = 'webhook-test-' + Date.now();
    
    const testConversation = {
      messages: [
        { role: 'user', content: 'Hello, I am testing memory. My name is Jamie and I love music.' },
        { role: 'assistant', content: 'Nice to meet you Jamie! I\'ll remember that you love music.' }
      ],
      agent_id: 'vasa-test',
      conversation_id: 'test-' + Date.now()
    };
    
    // Test add memory
    log('Adding test memory...');
    const addResult = await mem0Service.addMemory(testUserId, testConversation);
    log('Memory add result', addResult);
    
    // Wait for indexing
    log('⏳ Waiting 2 seconds for indexing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test search
    log('Testing memory search...');
    const searchResult = await mem0Service.searchMemories(testUserId, 'Jamie music preferences', 3);
    log('Search result', searchResult);
    
    // Test get all
    log('Testing get all memories...');
    const allMemories = await mem0Service.getMemories(testUserId, 5);
    log('Get all result', allMemories);
    
    // Determine if Mem0 is actually working
    const isRealMem0 = addResult.mode !== 'openai_fallback' && addResult.mode !== 'fallback';
    
    log(isRealMem0 ? '🎉 SUCCESS: Real Mem0 is working!' : '⚠️ WARNING: Using fallback mode - Mem0 not connected');
    
    return res.status(200).json({
      success: true,
      test_completed: true,
      mem0_working: isRealMem0,
      mode: addResult.mode || 'unknown',
      service_status: serviceStatus,
      results,
      next_steps: isRealMem0 
        ? ['✅ Mem0 is working! Check dashboard: https://app.mem0.ai/dashboard']
        : [
            '❌ Mem0 not working - check these:',
            '1. Verify MEM0_API_KEY is correct in Vercel environment variables',
            '2. Ensure mem0ai package is in package.json dependencies',
            '3. Redeploy after making changes'
          ]
    });
    
  } catch (error) {
    log('❌ Test failed', { error: error.message });
    
    return res.status(500).json({
      success: false,
      error: error.message,
      results,
      debugging_help: [
        'Check Vercel environment variables are set correctly',
        'Verify API keys are valid',
        'Ensure mem0ai package is installed',
        'Check Vercel function logs for more details'
      ]
    });
  }
}
