// api/test-mem0-client.js - Test MemoryClient directly with different formats

export default async function handler(req, res) {
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
    log('🧪 Testing MemoryClient API');
    
    if (!process.env.MEM0_API_KEY) {
      throw new Error('MEM0_API_KEY missing');
    }
    
    // Import and use MemoryClient directly
    log('📦 Importing mem0ai and creating MemoryClient...');
    const { MemoryClient } = await import('mem0ai');
    
    if (!MemoryClient) {
      throw new Error('MemoryClient not found in mem0ai package');
    }
    
    log('✅ MemoryClient found, testing different API key formats...');
    
    // Test different API key parameter formats
    const apiKeyFormats = [
      { name: 'api_key', config: { api_key: process.env.MEM0_API_KEY } },
      { name: 'apiKey', config: { apiKey: process.env.MEM0_API_KEY } },
      { name: 'token', config: { token: process.env.MEM0_API_KEY } },
      { name: 'key', config: { key: process.env.MEM0_API_KEY } },
      { name: 'auth.api_key', config: { auth: { api_key: process.env.MEM0_API_KEY } } },
      { name: 'config.api_key', config: { config: { api_key: process.env.MEM0_API_KEY } } }
    ];
    
    let client = null;
    let workingKeyFormat = null;
    
    for (const keyFormat of apiKeyFormats) {
      try {
        log(`🔑 Testing API key format: ${keyFormat.name}`);
        client = new MemoryClient(keyFormat.config);
        log(`✅ MemoryClient created successfully with ${keyFormat.name}`);
        workingKeyFormat = keyFormat.name;
        break;
      } catch (keyError) {
        log(`❌ API key format ${keyFormat.name} failed: ${keyError.message}`);
      }
    }
    
    if (!client) {
      throw new Error('All API key formats failed');
    }
    
    log(`✅ MemoryClient instance created with ${workingKeyFormat}`);
    
    const testUserId = 'client-test-' + Date.now();
    const testMessage = 'Testing MemoryClient. My name is Alex and I love programming.';
    
    // Test different API formats for MemoryClient
    const formatTests = [
      {
        name: 'add(message, userId)',
        test: async () => await client.add(testMessage, testUserId)
      },
      {
        name: 'add(message, userId, options)',
        test: async () => await client.add(testMessage, testUserId, {
          metadata: { test: true }
        })
      },
      {
        name: 'add({text, user_id})',
        test: async () => await client.add({
          text: testMessage,
          user_id: testUserId
        })
      },
      {
        name: 'add({messages, user_id})',
        test: async () => await client.add({
          messages: [{ role: 'user', content: testMessage }],
          user_id: testUserId
        })
      },
      {
        name: 'add({content, user_id})',
        test: async () => await client.add({
          content: testMessage,
          user_id: testUserId
        })
      }
    ];
    
    let workingFormat = null;
    let workingResult = null;
    
    for (const formatTest of formatTests) {
      try {
        log(`🧪 Testing: ${formatTest.name}`);
        const result = await formatTest.test();
        log(`✅ SUCCESS: ${formatTest.name}`, result);
        
        if (!workingFormat) {
          workingFormat = formatTest.name;
          workingResult = result;
          
          // Test search with working format
          try {
            log('🔍 Testing search...');
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for indexing
            const searchResult = await client.search('Alex programming', testUserId, { limit: 1 });
            log('✅ Search works!', searchResult);
          } catch (searchError) {
            log('⚠️ Search error (but add worked):', searchError.message);
          }
        }
        
      } catch (error) {
        log(`❌ FAILED: ${formatTest.name} - ${error.message}`);
      }
    }
    
    if (workingFormat) {
      return res.status(200).json({
        success: true,
        mem0_working: true,
        working_api_key_format: workingKeyFormat,
        working_method_format: workingFormat,
        working_result: workingResult,
        results,
        fix_instructions: [
          '✅ MemoryClient is working!',
          `✅ Use API key format: ${workingKeyFormat}`,
          `✅ Use method format: ${workingFormat}`,
          '✅ Update mem0Service.js with these formats',
          '✅ Your Mem0 dashboard should now show activity!'
        ]
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'MemoryClient created but no working method format found',
        working_api_key_format: workingKeyFormat,
        results
      });
    }
    
  } catch (error) {
    log('❌ Test failed', { error: error.message });
    
    return res.status(500).json({
      success: false,
      error: error.message,
      results
    });
  }
}
