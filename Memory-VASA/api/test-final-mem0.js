// api/test-final-mem0.js - Test with ARRAY format (what Mem0 actually expects)

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
    log('🧪 Testing MemoryClient with ARRAY format (final test)');
    
    // Create MemoryClient
    const { MemoryClient } = await import('mem0ai');
    const client = new MemoryClient({ apiKey: process.env.MEM0_API_KEY });
    log('✅ MemoryClient created successfully');
    
    const testUserId = 'final-test-' + Date.now();
    
    // Test with ARRAY format (what the error messages suggest)
    const testFormats = [
      {
        name: 'add([messageString], userId)',
        test: async () => await client.add(
          ['Testing final format. My name is Sarah and I love books.'], 
          testUserId
        )
      },
      {
        name: 'add([{role: "user", content: message}], userId)',
        test: async () => await client.add(
          [{ role: 'user', content: 'Testing with role format. My name is Sarah and I love books.' }], 
          testUserId
        )
      },
      {
        name: 'add([{role: "user", content: message}], {user_id: userId})',
        test: async () => await client.add(
          [{ role: 'user', content: 'Testing with role and user_id object. My name is Sarah and I love books.' }], 
          { user_id: testUserId }
        )
      },
      {
        name: 'add(messageString, {user_id: userId}) - Direct API style',
        test: async () => await client.add(
          'Testing direct API style. My name is Sarah and I love books.',
          { user_id: testUserId }
        )
      },
      {
        name: 'add({messages: [message], user_id: userId}) - Full object',
        test: async () => await client.add({
          messages: [{ role: 'user', content: 'Testing full object style. My name is Sarah and I love books.' }],
          user_id: testUserId
        })
      }
    ];
    
    let workingFormat = null;
    let workingResult = null;
    
    for (const test of testFormats) {
      try {
        log(`🧪 Testing: ${test.name}`);
        const result = await test.test();
        log(`✅ SUCCESS: ${test.name}`, result);
        
        if (!workingFormat) {
          workingFormat = test.name;
          workingResult = result;
          
          // Test search immediately
          try {
            log('🔍 Testing search with working format...');
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for indexing
            const searchResult = await client.search('Sarah books', testUserId);
            log('✅ Search works!', searchResult);
          } catch (searchError) {
            log('⚠️ Search error:', searchError.message);
          }
        }
        
      } catch (error) {
        log(`❌ FAILED: ${test.name} - ${error.message}`);
      }
    }
    
    if (workingFormat) {
      return res.status(200).json({
        success: true,
        mem0_fully_working: true,
        constructor: 'new MemoryClient({ apiKey: process.env.MEM0_API_KEY })',
        working_add_format: workingFormat,
        working_result: workingResult,
        results,
        implementation_ready: {
          constructor_code: 'const client = new MemoryClient({ apiKey: process.env.MEM0_API_KEY });',
          add_method_code: workingFormat,
          search_method: 'client.search(query, userId)',
          status: 'READY TO IMPLEMENT IN mem0Service.js'
        },
        next_steps: [
          '🎉 MemoryClient is fully working!',
          '✅ Update mem0Service.js with these exact formats',
          '✅ Deploy and test your main application',
          '✅ Check Mem0 dashboard for new memories!'
        ]
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Still no working format found - may need to check Mem0 API documentation',
        constructor_working: true,
        results,
        suggestion: 'Check official Mem0 documentation for correct API format'
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
