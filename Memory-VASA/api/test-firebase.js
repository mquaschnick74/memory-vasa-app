// Add this debug code to your client-side JavaScript

// Enhanced error tracking for the start-conversation endpoint
async function debugStartConversation(userUUID) {
  console.log('🐛 DEBUG: Starting conversation debug test...');
  console.log('🐛 User UUID:', userUUID);
  
  try {
    // Test Firebase connectivity first
    console.log('🐛 Testing Firebase connection...');
    const firebaseTest = await fetch('/api/test-firebase');
    const firebaseResult = await firebaseTest.json();
    
    console.log('🐛 Firebase test result:', firebaseResult);
    
    if (!firebaseResult.success) {
      console.error('❌ Firebase test failed:', firebaseResult);
      return { error: 'Firebase connection failed', details: firebaseResult };
    }
    
    // Now test start-conversation
    console.log('🐛 Testing start-conversation endpoint...');
    const response = await fetch('/api/start-conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userUUID: userUUID,
        conversationData: {
          user_name: 'Debug Test User',
          source: 'debug_test'
        },
        agentConfig: {
          agent_id: 'debug-test-agent'
        }
      })
    });
    
    console.log('🐛 Response status:', response.status);
    console.log('🐛 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('🐛 Raw response:', responseText);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse response as JSON:', parseError);
      return { 
        error: 'Invalid JSON response', 
        status: response.status, 
        rawResponse: responseText 
      };
    }
    
    if (response.ok) {
      console.log('✅ Start conversation successful:', responseData);
      return { success: true, data: responseData };
    } else {
      console.error('❌ Start conversation failed:', responseData);
      return { 
        error: 'API error', 
        status: response.status, 
        data: responseData 
      };
    }
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
    return { 
      error: 'Network or execution error', 
      message: error.message,
      stack: error.stack 
    };
  }
}

// Enhanced error tracking for your existing connection code
function enhanceExistingErrorHandling() {
  // Add this to your existing onConnect function or wherever the error occurs
  
  // Wrap your existing fetch call like this:
  const originalFetch = window.fetch;
  window.fetch = async function(url, options) {
    console.log('🐛 Fetch called:', url, options);
    
    try {
      const response = await originalFetch(url, options);
      
      if (!response.ok) {
        console.error('❌ Fetch failed:', {
          url,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        // Try to get response body for debugging
        const responseClone = response.clone();
        try {
          const responseText = await responseClone.text();
          console.error('❌ Response body:', responseText);
        } catch (bodyError) {
          console.error('❌ Could not read response body:', bodyError);
        }
      }
      
      return response;
    } catch (error) {
      console.error('❌ Fetch network error:', {
        url,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  };
}

// Call this when your app loads
enhanceExistingErrorHandling();

// Test function you can call manually
window.debugVASA = {
  testStartConversation: debugStartConversation,
  testFirebase: async () => {
    const response = await fetch('/api/test-firebase');
    return await response.json();
  }
};

console.log('🐛 Debug tools loaded. Use window.debugVASA.testStartConversation("your-user-id") to test');
