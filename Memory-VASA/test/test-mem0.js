// test/test-mem0.js
import mem0Service from '../lib/mem0Service.js';
import firebaseMemoryManager from '../lib/firebaseMemoryManager.js';

async function testMem0Integration() {
  console.log('🧪 Testing Mem0 Integration...');
  
  const testUserId = 'test_user_123';
  const testConversationId = 'test_conv_456';
  
  try {
    // Test 1: Add memory
    console.log('\n1️⃣ Testing memory addition...');
    const testMessages = [
      { role: 'user', content: 'Hello, my name is John and I love pizza' },
      { role: 'assistant', content: 'Nice to meet you John! I see you enjoy pizza. What\'s your favorite type?' },
      { role: 'user', content: 'I really like pepperoni pizza' }
    ];

    await mem0Service.addMemory(testUserId, {
      messages: testMessages,
      agent_id: 'test_agent',
      conversation_id: testConversationId
    });
    console.log('✅ Memory added successfully');

    // Test 2: Search memories
    console.log('\n2️⃣ Testing memory search...');
    const searchResults = await mem0Service.searchMemories(testUserId, 'pizza preferences');
    console.log('✅ Search results:', searchResults);

    // Test 3: Firebase integration
    console.log('\n3️⃣ Testing Firebase integration...');
    await firebaseMemoryManager.saveConversationMemory(testUserId, {
      agent_id: 'test_agent',
      conversation_id: testConversationId,
      messages: testMessages,
      message_type: 'conversation_end',
      message: 'Test conversation completed'
    });
    console.log('✅ Firebase memory saved');

    // Test 4: Get conversation history
    console.log('\n4️⃣ Testing conversation history retrieval...');
    const history = await firebaseMemoryManager.getConversationHistory(testUserId, testConversationId);
    console.log('✅ Retrieved history:', history.length, 'entries');

    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testMem0Integration();
}

export { testMem0Integration };
