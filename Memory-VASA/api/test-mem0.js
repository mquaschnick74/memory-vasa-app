// api/test-mem0.js - Test Mem0 connection via Vercel API endpoint

export default async function handler(req, res) {
  // Set CORS headers for browser access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const results = [];
  
  function log(message, data = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      data
    };
    results.push(logEntry);
    console.log(message, data);
  }

  try {
    log('🧪 Starting Mem0 Test on Vercel');
    
    // Step 1: Check environment variables
    log('1️⃣ Checking Environment Variables');
    const envCheck = {
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      MEM0_API_KEY: !!process.env.MEM0_API_KEY,
      MEM0_LLM_MODEL: process.env.MEM0_LLM_MODEL || 'default: gpt-4o-mini',
      MEM0_EMBEDDING_MODEL: process.env.MEM0_EMBEDDING_MODEL || 'default: text-embedding-3-small'
    };
    log('Environment Check', envCheck);
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY missing in Vercel environment variables');
    }
    
    if (!process.env.MEM0_API_KEY) {
      throw new Error('MEM0_API_KEY missing in Vercel environment variables. Get it from https://app.mem0.ai/dashboard/api-keys');
    }
    
    // Step 2: Test mem0ai import
    log('2️⃣ Testing mem0ai package import');
    let mem0ai;
    try {
      mem0ai = await import('mem0ai');
      log('✅ mem0ai package imported successfully');
    } catch (importError) {
      log('❌ Failed to import mem0ai', { error: importError.message });
      throw new Error(`mem0ai import failed: ${importError.message}. Try adding mem0ai to your package.json dependencies.`);
    }
    
    // Step 3: Check Memory class
    log('3️⃣ Checking Memory class availability');
    const MemoryClass = mem0ai.Memory || mem0ai.default?.Memory;
    if (!MemoryClass) {
      log('❌ Memory class not found', { availableKeys: Object.keys(mem0ai) });
      throw new Error('Memory class not found in mem0ai package');
    }
    log('✅ Memory class found');
    
    // Step 4: Initialize Memory instance
    log('4️⃣ Initializing Memory instance');
    const memory = new MemoryClass({
      api_key: process.env.MEM0_API_KEY,
      config: {
        llm: {
          provider: "openai",
          config: {
            model: process.env.MEM0_LLM_MODEL || "gpt-4o-mini",
            api_key: process.env.OPENAI_API_KEY
          }
        },
        embedder: {
          provider: "openai", 
          config: {
            model: process.env.MEM0_EMBEDDING_MODEL || "text-embedding-3-small",
            api_key: process.env.OPENAI_API_KEY
          }
        }
      }
    });
    log('✅ Memory instance created');
    
    // Step 5: Test memory operations
    log('5️⃣ Testing memory operations');
    const testUserId = 'vercel-test-' + Date.now();
    
    // Test add memory
    log('Adding test memory...');
    const addResult = await memory.add(
      'This is a Vercel test. My name is Alex and I love coding and pizza.',
      testUserId,
      {
        metadata: {
          source: 'vercel-test',
          timestamp: new Date().toISOString()
        }
      }
    );
    log('✅ Memory added successfully', addResult);
    
    // Wait for indexing
    log('⏳ Waiting 3 seconds for memory indexing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test search
    log('Testing memory search...');
    const searchResult = await memory.search(
      'Alex coding pizza preferences',
      testUserId,
      { limit: 3 }
    );
    log('✅ Memory search completed', searchResult);
    
    // Test get all
    log('Testing get all memories...');
    const allMemories = await memory.get_all(testUserId, { limit: 5 });
    log('✅ Get all memories completed', allMemories);
    
    // Final success
    log('🎉 ALL TESTS PASSED! Mem0 is working correctly on Vercel!');
    log('📊 Check your dashboard at: https://app.mem0.ai/dashboard');
    
    return res.status(200).json({
      success: true,
      message: 'Mem0 test completed successfully!',
      results,
      summary: {
        mem0_working: true,
        memories_added: 1,
        search_working: true,
        dashboard_url: 'https://app.mem0.ai/dashboard'
      }
    });
    
  } catch (error) {
    log('❌ Test failed', { error: error.message, stack: error.stack });
    
    // Provide specific debugging help
    let debuggingTips = [];
    
    if (error.message.includes('MEM0_API_KEY')) {
      debuggingTips = [
        '1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables',
        '2. Add MEM0_API_KEY with your key from https://app.mem0.ai/dashboard/api-keys',
        '3. Redeploy your project after adding the environment variable'
      ];
    } else if (error.message.includes('mem0ai')) {
      debuggingTips = [
        '1. Add "mem0ai": "latest" to your package.json dependencies',
        '2. Commit and push to trigger a new Vercel deployment',
        '3. Or try adding "mem0ai": "^2.1.30" specifically'
      ];
    } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      debuggingTips = [
        '1. Verify your MEM0_API_KEY is correct in Vercel environment variables',
        '2. Check if the API key is active in your Mem0 dashboard',
        '3. Try creating a new API key'
      ];
    } else {
      debuggingTips = [
        '1. Check all environment variables are set in Vercel',
        '2. Ensure mem0ai package is in your package.json',
        '3. Try redeploying your Vercel project'
      ];
    }
    
    return res.status(500).json({
      success: false,
      error: error.message,
      results,
      debugging_tips: debuggingTips,
      next_steps: [
        'Fix the issue mentioned above',
        'Redeploy on Vercel if needed',
        'Try this test endpoint again'
      ]
    });
  }
}
