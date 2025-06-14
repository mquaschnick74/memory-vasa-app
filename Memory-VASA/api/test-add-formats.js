// api/test-add-formats.js - Test different add() method parameter formats

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
    log('🧪 Testing MemoryClient add() method formats');
    
    // Create MemoryClient (we know this works)
    const { MemoryClient } = await import('mem0ai');
    const client = new MemoryClient({ apiKey: process.env.MEM0_API_KEY });
    log('✅ MemoryClient created successfully');
    
    const testUserId = 'add-test-' + Date.now();
    const testMessage = 'Testing add formats. My name is TestUser and I like coffee.';
    
    // Test different add() method formats
    const addTests = [
      {
        name: 'add(message, userId) - string userId',
        test: async () => await client.add(testMessage, testUserId)
      },
      {
        name: 'add(message, {user_id: userId})',
        test: async () => await client.add(testMessage, { user_id: testUserId })
      },
      {
        name: 'add(message, {userId: userId})',
        test: async () => await client.add(testMessage, { userId: testUserId })
      },
      {
        name: 'add(message, {id: userId})',
        test: async () => await client.add(testMessage, { id: testUserId })
      },
      {
        name: 'add({text: message, user_id: userId})',
        test: async () => await client.add({ text: testMessage, user_id: testUserId })
      },
      {
        name: 'add({text: message, userId: userId})',
        test: async () => await client.add({ text: testMessage, userId: testUserId })
      },
      {
        name: 'add({content: message, user_id: userId})',
        test: async () => await client.add({ content: testMessage, user_id: testUserId })
      },
      {
        name: 'add({message: message, user_id: userId})',
        test: async () => await client.add({ message: testMessage, user_id: testUserId })
      },
      {
        name: 'add({messages: [message], user_id: userId})',
        test: async () => await client.add({ 
          messages: [{ role: 'user', content: testMessage }], 
          user_id: testUserId 
        })
      },
      {
        name: 'add(message, {user_id: userId, org_id: "default"})',
        test: async () => await client.add(testMessage, { 
          user_id: testUserId, 
          org_id: "default" 
        })
      },
      {
        name: 'add({text: message, user: {id: userId}})',
        test: async () => await client.add({ 
          text: testMessage, 
          user: { id: testUserId } 
        })
      }
    ];
    
    let workingFormat = null;
    let workingResult = null;
    
    for (const addTest of addTests) {
      try {
        log(`🧪 Testing: ${addTest.name}`);
        const result = await addTest.test();
        log(`✅ SUCCESS: ${addTest.name}`, result);
        
        if (!workingFormat) {
          workingFormat = addTest.name;
          workingResult = result;
          
          // Test search to make sure it's fully working
          try {
            log('🔍 Testing search...');
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for indexing
            const searchResult = await client.search('TestUser coffee', testUserId);
            log('✅ Search works too!', searchResult);
          } catch (searchError) {
            log('⚠️ Search error (but add worked):', searchError.message);
          }
        }
        
      } catch (error) {
        log(`❌ FAILED: ${addTest.name} - ${error.message}`);
      }
    }
    
    if (workingFormat) {
      return res.status(200).json({
        success: true,
        mem0_working: true,
        constructor_format: '{ apiKey: "..." }',
        working_add_format: workingFormat,
        working_result: workingResult,
        results,
        complete_solution: {
          constructor: 'new MemoryClient({ apiKey: process.env.MEM0_API_KEY })',
          add_method: workingFormat,
          ready_to_implement: true
        },
        next_steps: [
          '✅ MemoryClient is fully working!',
          `✅ Use constructor: new MemoryClient({ apiKey: "..." })`,
          `✅ Use add method: ${workingFormat}`,
          '✅ Update mem0Service.js with these formats',
          '✅ Check your Mem0 dashboard for new memories!'
        ]
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Constructor works but no working add() format found',
        constructor_format: '{ apiKey: "..." }',
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
