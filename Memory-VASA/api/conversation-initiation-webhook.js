// api/conversation-initiation-webhook.js
// Ultra-simple webhook for debugging

export default async function handler(req, res) {
  console.log('🔗 Simple webhook called!');
  
  // Just return basic test data without any imports or complex logic
  try {
    const testData = {
      dynamic_variables: {
        previous_conversations: "Hello! I'm working with test memory data from the webhook. You've been testing the memory system successfully.",
        user_name: "Jamie",
        conversation_history: "Previous test conversations about memory functionality",
        user_id: "AVs5XlU6qQezh8GiNlRwN6UEfjM2"
      },
      conversation_config_override: {
        agent: {
          first_message: "Hello Jamie! The webhook is working and I have test memory data. Can you hear me reference this?"
        }
      }
    };
    
    console.log('✅ Returning test memory data');
    res.status(200).json(testData);
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
}
