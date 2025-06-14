// direct-mem0-test.js - Test Mem0 directly without webhook interference
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testMem0Direct() {
  console.log('🧪 Direct Mem0 Test (No Webhooks)\n');
  
  // Check environment
  console.log('Environment Check:');
  console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅' : '❌');
  console.log('- MEM0_API_KEY:', process.env.MEM0_API_KEY ? '✅' : '❌');
  console.log('');
  
  if (!process.env.MEM0_API_KEY) {
    console.log('❌ Missing MEM0_API_KEY. Get it from: https://app.mem0.ai/dashboard/api-keys');
    return;
  }
  
  try {
    console.log('🔄 Testing direct Mem0 import...');
    
    // Test direct import
    let mem0ai;
    try {
      mem0ai = await import('mem0ai');
      console.log('✅ mem0ai package imported successfully');
    } catch (error) {
      console.log('❌ Failed to import mem0ai:', error.message);
      console.log('💡 Try: npm install mem0ai@latest');
      return;
    }
    
    // Test Memory class
    const MemoryClass = mem0ai.Memory || mem0ai.default?.Memory;
    if (!MemoryClass) {
      console.log('❌ Memory class not found in package');
      console.log('Package contents:', Object.keys(mem0ai));
      return;
    }
    
    console.log('✅ Memory class found');
    
    // Initialize Memory
    console.log('🔄 Initializing Memory instance...');
    const memory = new MemoryClass({
      api_key: process.env.MEM0_API_KEY
    });
    
    console.log('✅ Memory instance created');
    
    // Test basic operations
    const testUserId = 'direct-test-' + Date.now();
    
    console.log('🔄 Testing add memory...');
    const addResult = await memory.add(
      'This is a direct test. My name is Sarah and I enjoy reading books.',
      testUserId
    );
    
    console.log('✅ Memory added:', addResult);
    
    // Wait for indexing
    console.log('⏳ Waiting 3 seconds for indexing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔄 Testing search...');
    const searchResult = await memory.search(
      'Sarah books reading',
      testUserId,
      { limit: 3 }
    );
    
    console.log('✅ Search result:', searchResult);
    
    console.log('🔄 Testing get all...');
    const allMemories = await memory.get_all(testUserId);
    console.log('✅ All memories:', allMemories);
    
    console.log('\n🎉 SUCCESS! Mem0 is working correctly!');
    console.log('📊 Check your dashboard: https://app.mem0.ai/dashboard');
    
  } catch (error) {
    console.error('❌ Direct test failed:', error.message);
    console.error('Full error:', error);
    
    // Specific error handling
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.log('\n💡 This looks like an API key issue:');
      console.log('1. Double-check your MEM0_API_KEY in .env');
      console.log('2. Verify the key is active in your Mem0 dashboard');
      console.log('3. Try creating a new API key');
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      console.log('\n💡 This looks like a network issue:');
      console.log('1. Check your internet connection');
      console.log('2. Verify Mem0 service is accessible');
      console.log('3. Check for firewall/proxy issues');
    } else {
      console.log('\n💡 Debugging steps:');
      console.log('1. npm list mem0ai');
      console.log('2. npm uninstall mem0ai && npm install mem0ai@latest');
      console.log('3. Check Node.js version compatibility');
    }
  }
}

// Run the test
testMem0Direct().catch(console.error);
