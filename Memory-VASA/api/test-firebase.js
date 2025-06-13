// /api/test-firebase.js - Test Firebase connection and data storage
import { 
  storeConversationMapping, 
  getUserFromConversation,
  storeConversationData,
  getConversationHistory 
} from '../lib/serverDb.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const testResults = {
    firebaseConnection: false,
    storeMapping: false,
    retrieveMapping: false,
    storeData: false,
    retrieveHistory: false,
    errors: []
  };

  try {
    // Test 1: Store a test mapping
    const testConversationId = `test-conv-${Date.now()}`;
    const testUserUUID = 'test-user-123';

    try {
      await storeConversationMapping(testConversationId, testUserUUID);
      testResults.storeMapping = true;
      console.log('✅ Test 1 passed: Store mapping');
    } catch (error) {
      testResults.errors.push(`Store mapping: ${error.message}`);
    }

    // Test 2: Retrieve the mapping
    try {
      const retrievedUser = await getUserFromConversation(testConversationId);
      testResults.retrieveMapping = retrievedUser === testUserUUID;
      console.log('✅ Test 2 passed: Retrieve mapping');
    } catch (error) {
      testResults.errors.push(`Retrieve mapping: ${error.message}`);
    }

    // Test 3: Store conversation data
    try {
      await storeConversationData(testUserUUID, {
        message: { content: 'Test message', role: 'user' },
        message_type: 'user_message',
        conversation_id: testConversationId,
        agent_id: 'test-agent',
        timestamp: new Date().toISOString()
      });
      testResults.storeData = true;
      console.log('✅ Test 3 passed: Store conversation data');
    } catch (error) {
      testResults.errors.push(`Store data: ${error.message}`);
    }

    // Test 4: Retrieve conversation history
    try {
      const history = await getConversationHistory(testUserUUID, 10);
      testResults.retrieveHistory = history.length > 0;
      console.log('✅ Test 4 passed: Retrieve history');
    } catch (error) {
      testResults.errors.push(`Retrieve history: ${error.message}`);
    }

    // Overall Firebase connection
    testResults.firebaseConnection = testResults.storeMapping || testResults.storeData;

    return res.status(200).json({
      success: true,
      message: 'Firebase connection test completed',
      results: testResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Firebase test failed',
      details: error.message,
      results: testResults
    });
  }
}
