// test-mem0-connection.js - Test your Mem0 connection
import dotenv from 'dotenv';
import mem0Service from './lib/mem0Service.js';

// Load environment variables
dotenv.config();

async function testMem0Connection() {
  console.log('🚀 Starting Mem0 Connection Test...\n');
  
  // Step 1: Check environment variables
  console.log('1️⃣ Checking Environment Variables:');
  console.log('   OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Present' : '❌ Missing');
  console.log('   MEM0_API_KEY:', process.env.MEM0_API_KEY ? '✅ Present' : '❌ Missing');
  console.log('   MEM0_LLM_MODEL:', process.env.MEM0_LLM_MODEL || 'Using default: gpt-4o-mini');
  console.log('   MEM0_EMBEDDING_MODEL:', process.env.MEM0_EMBEDDING_MODEL || 'Using default: text-embedding-3-small');
  console.log('');
  
  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ OPENAI_API_KEY is required. Add it to your .env file.');
    return;
  }
  
  if (!process.env.MEM0_API_KEY) {
    console.log('❌ MEM0_API_KEY is required. Get it from https://app.mem0.ai/dashboard/api-keys');
    return;
  }
  
  // Step 2: Check service status
  console.log('2️⃣ Checking Mem0 Service Status:');
  const status = mem0Service.getStatus();
  console.log('   Service Status:', JSON.stringify(status, null, 2));
  console.log('');
  
  // Step 3: Test basic operations
  try {
    const testUserId = 'test-user-' + Date.now();
    
    console.log('3️⃣ Testing Memory Addition:');
    const testConversation = {
      messages: [
        { role: 'user', content: 'Hello, I am testing the memory system. My name is John and I love pizza.' },
        { role: 'assistant', content: 'Nice to meet you John! I\'ll remember that you love pizza. How can I help you today?' }
      ],
      agent_id: 'vasa-test',
      conversation_id: 'test-conv-' + Date.now()
    };
    
    const addResult = await mem0Service.addMemory(testUserId, testConversation, {
      test: true,
      timestamp: new Date().toISOString()
    });
    
    console.log('   ✅ Memory Added:', JSON.stringify(addResult, null, 2));
    console.log('');
    
    // Wait a moment for memory to be indexed
    console.log('⏳ Waiting 2 seconds for memory indexing...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('4️⃣ Testing Memory Search:');
    const searchResult = await mem0Service.searchMemories(testUserId, 'John pizza food preferences', 3);
    console.log('   ✅ Search Results:', JSON.stringify(searchResult, null, 2));
    console.log('');
    
    console.log('5️⃣ Testing Memory Retrieval:');
    const allMemories = await mem0Service.getMemories(testUserId, 5);
    console.log('   ✅ All Memories:', JSON.stringify(allMemories, null, 2));
    console.log('');
    
    console.log('6️⃣ Testing Contextual Response:');
    const contextualResponse = await mem0Service.generateContextualResponse(
      testUserId,
      'What do you remember about me?',
      searchResult
    );
    console.log('   ✅ Contextual Response:', contextualResponse);
    console.log('');
    
    // Final status check
    const finalStatus = mem0Service.getStatus();
    console.log('🎉 Test Complete! Final Status:');
    console.log('   Mode:', finalStatus.mode);
    console.log('   Mem0 Available:', finalStatus.mem0Available);
    
    if (finalStatus.mem0Available) {
      console.log('✅ SUCCESS: Mem0 is properly connected and working!');
      console.log('📊 Check your dashboard at: https://app.mem0.ai/dashboard');
    } else {
      console.log('⚠️  WARNING: Running in fallback mode. Check your MEM0_API_KEY.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
    
    // Provide debugging hints
    console.log('\n🔧 Debugging Tips:');
    console.log('1. Verify your MEM0_API_KEY is correct');
    console.log('2. Check if mem0ai package is installed: npm list mem0ai');
    console.log('3. Try reinstalling: npm uninstall mem0ai && npm install mem0ai@latest');
    console.log('4. Check network connectivity');
    console.log('5. Verify API key permissions in Mem0 dashboard');
  }
}

// Run the test
testMem0Connection().catch(console.error);
