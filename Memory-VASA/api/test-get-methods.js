// api/test-get-methods.js - Find the correct "get all" method name

export default async function handler(req, res) {
  try {
    const { MemoryClient } = await import('mem0ai');
    const client = new MemoryClient({ apiKey: process.env.MEM0_API_KEY });
    
    const testUserId = { user_id: 'method-test-' + Date.now() };
    
    // First add a test memory
    await client.add([{ role: 'user', content: 'Test memory for method testing' }], testUserId);
    
    // Test different method names for getting memories
    const methodTests = [
      { name: 'get_all', test: () => client.get_all(testUserId) },
      { name: 'getAll', test: () => client.getAll(testUserId) },
      { name: 'list', test: () => client.list(testUserId) },
      { name: 'get', test: () => client.get(testUserId) },
      { name: 'getMemories', test: () => client.getMemories(testUserId) },
      { name: 'all', test: () => client.all(testUserId) }
    ];
    
    for (const methodTest of methodTests) {
      try {
        console.log(`Testing method: ${methodTest.name}`);
        const result = await methodTest.test();
        console.log(`✅ SUCCESS: ${methodTest.name} works!`, result);
        
        return res.status(200).json({
          success: true,
          working_method: methodTest.name,
          result: result,
          message: `Found working method: client.${methodTest.name}()`
        });
        
      } catch (error) {
        console.log(`❌ ${methodTest.name} failed: ${error.message}`);
      }
    }
    
    // Also check what methods are available
    const clientMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(client))
      .filter(name => typeof client[name] === 'function');
    
    return res.status(500).json({
      success: false,
      error: 'No working get method found',
      available_methods: clientMethods,
      suggestion: 'Check available_methods to see what methods exist'
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
