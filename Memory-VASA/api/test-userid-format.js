// api/test-userid-format.js - Test userId as object format

export default async function handler(req, res) {
  try {
    console.log('🧪 Testing userId object format');
    
    const { MemoryClient } = await import('mem0ai');
    const client = new MemoryClient({ apiKey: process.env.MEM0_API_KEY });
    
    const testUserId = 'userid-test-' + Date.now();
    const testMessages = [{ role: 'user', content: 'Testing userId object format. My name is Alex.' }];
    
    // Test different userId formats
    const userIdTests = [
      {
        name: 'userId as {user_id: string}',
        test: async () => await client.add(testMessages, { user_id: testUserId })
      },
      {
        name: 'userId as {user_id: string, org_id: "default"}',
        test: async () => await client.add(testMessages, { 
          user_id: testUserId, 
          org_id: "default" 
        })
      },
      {
        name: 'userId as {id: string}',
        test: async () => await client.add(testMessages, { id: testUserId })
      },
      {
        name: 'Full object format',
        test: async () => await client.add({
          messages: testMessages,
          user_id: testUserId
        })
      },
      {
        name: 'Full object with org_id',
        test: async () => await client.add({
          messages: testMessages,
          user_id: testUserId,
          org_id: "default"
        })
      }
    ];
    
    for (const test of userIdTests) {
      try {
        console.log(`🧪 Testing: ${test.name}`);
        const result = await test.test();
        console.log(`✅ SUCCESS: ${test.name}`, result);
        
        return res.status(200).json({
          success: true,
          working_format: test.name,
          result: result,
          message: 'Found working userId format!'
        });
        
      } catch (error) {
        console.log(`❌ FAILED: ${test.name} - ${error.message}`);
      }
    }
    
    return res.status(500).json({
      success: false,
      error: 'No working userId format found'
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
