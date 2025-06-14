// api/test-mem0-formats.js - Test different Mem0 API formats to find the right one

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
    log('🧪 Testing Different Mem0 API Formats');
    
    // Check environment
    if (!process.env.MEM0_API_KEY) {
      throw new Error('MEM0_API_KEY missing');
    }
    
    log('✅ API key present');
    
    // Import mem0ai
    log('📦 Importing mem0ai package...');
    const mem0ai = await import('mem0ai');
    log('✅ Package imported', Object.keys(mem0ai));
    
    // Find Memory class
    const MemoryClass = mem0ai.Memory || mem0ai.default?.Memory;
    if (!MemoryClass) {
      throw new Error(`Memory class not found. Available: ${Object.keys(mem0ai)}`);
    }
    
    log('✅ Memory class found');
    
    // Create Memory instance
    log('🔄 Creating Memory instance...');
    const memory = new MemoryClass({
      api_key: process.env.MEM0_API_KEY
    });
    log('✅ Memory instance created');
    
    // Test different API call formats
    const testUserId = 'format-test-' + Date.now();
    const testMessage = 'Testing API formats. My name is TestUser.';
    
    const formatTests = [
      {
        name: 'Format 1: (message, userId)',
        test: async () => await memory.add(testMessage, testUserId)
      },
      {
        name: 'Format 2: (message, userId, metadata)',
        test: async () => await memory.add(testMessage, testUserId, {
          metadata: { test: true }
        })
      },
      {
        name: 'Format 3: Object with text and user_id',
        test: async () => await memory.add({
          text: testMessage,
          user_id: testUserId
        })
      },
      {
        name: 'Format 4: Object with messages and user_id',
        test: async () => await memory.add({
          messages: testMessage,
          user_id: testUserId
        })
      },
      {
        name: 'Format 5: Object with content and userId',
        test: async () => await memory.add({
          content: testMessage,
          userId: testUserId
        })
      },
      {
        name: 'Format 6: Full object structure',
        test: async () => await memory.add({
          text: testMessage,
          user_id: testUserId,
          metadata: {
            test: true,
            timestamp: new Date().toISOString()
          }
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
        }
        
        // Test search with this result
        try {
          log(`🔍 Testing search with ${formatTest.name}`);
          const searchResult = await memory.search('TestUser', testUserId, { limit: 1 });
          log(`✅ Search works with ${formatTest.name}`, searchResult);
        } catch (searchError) {
          log(`❌ Search failed with ${formatTest.name}: ${searchError.message}`);
        }
        
      } catch (error) {
        log(`❌ FAILED: ${formatTest.name} - ${error.message}`);
      }
    }
    
    if (workingFormat) {
      log(`🎉 Found working format: ${workingFormat}`);
      
      return res.status(200).json({
        success: true,
        working_format: workingFormat,
        working_result: workingResult,
        all_results: results,
        next_steps: [
          `✅ Use ${workingFormat} in your mem0Service.js`,
          '✅ Update addMemory method with correct format',
          '✅ Test with your main application'
        ]
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'No working API format found',
        results,
        debugging_info: {
          package_keys: Object.keys(mem0ai),
          memory_class_found: !!MemoryClass,
          api_key_present: !!process.env.MEM0_API_KEY
        }
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
