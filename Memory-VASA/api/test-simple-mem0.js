// api/test-simple-mem0.js - Simple test to check MemoryClient constructor

export default async function handler(req, res) {
  try {
    console.log('🧪 Simple MemoryClient Test');
    
    if (!process.env.MEM0_API_KEY) {
      return res.status(400).json({ error: 'MEM0_API_KEY missing from environment' });
    }
    
    console.log('✅ API Key present:', process.env.MEM0_API_KEY.substring(0, 10) + '...');
    
    // Import MemoryClient
    const { MemoryClient } = await import('mem0ai');
    console.log('✅ MemoryClient imported');
    
    // Try the simplest possible constructor calls
    const constructorTests = [
      {
        name: 'Just API key string',
        test: () => new MemoryClient(process.env.MEM0_API_KEY)
      },
      {
        name: 'Object with api_key',
        test: () => new MemoryClient({ api_key: process.env.MEM0_API_KEY })
      },
      {
        name: 'Object with apiKey',
        test: () => new MemoryClient({ apiKey: process.env.MEM0_API_KEY })
      },
      {
        name: 'Object with token',
        test: () => new MemoryClient({ token: process.env.MEM0_API_KEY })
      }
    ];
    
    let successfulClient = null;
    let workingConstructor = null;
    
    for (const test of constructorTests) {
      try {
        console.log(`🔑 Testing: ${test.name}`);
        const client = test.test();
        console.log(`✅ SUCCESS: ${test.name} worked!`);
        successfulClient = client;
        workingConstructor = test.name;
        break;
      } catch (error) {
        console.log(`❌ FAILED: ${test.name} - ${error.message}`);
      }
    }
    
    if (successfulClient) {
      // Try a simple method call
      try {
        console.log('🧪 Testing a simple add operation...');
        const testResult = await successfulClient.add('Simple test message', 'test-user-' + Date.now());
        console.log('✅ Add operation successful!', testResult);
        
        return res.status(200).json({
          success: true,
          mem0_working: true,
          working_constructor: workingConstructor,
          test_result: testResult,
          message: 'MemoryClient is working! Ready to update mem0Service.js'
        });
        
      } catch (addError) {
        console.log('❌ Add operation failed:', addError.message);
        
        return res.status(200).json({
          success: false,
          constructor_working: true,
          working_constructor: workingConstructor,
          add_error: addError.message,
          message: 'Constructor works, but API call format needs adjustment'
        });
      }
    } else {
      return res.status(500).json({
        success: false,
        error: 'No working constructor format found',
        tried_formats: constructorTests.map(t => t.name),
        api_key_preview: process.env.MEM0_API_KEY.substring(0, 10) + '...'
      });
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
