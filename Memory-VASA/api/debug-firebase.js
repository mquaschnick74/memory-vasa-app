// Add this to a new file: /api/debug-firebase.js
// This will show you exactly what conversation data is stored for your user

import { getUserProfile, getConversationHistory } from '../lib/serverDB.js';

export default async function handler(req, res) {
  const timestamp = new Date().toISOString();
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const USER_UUID = 'NEgpc2haPnU2ZafTt6ECEZZMpcK2';
    
    console.log(`[${timestamp}] 🔍 Debugging Firebase data for user: ${USER_UUID}`);
    
    // Get user profile
    const profile = await getUserProfile(USER_UUID);
    console.log(`[${timestamp}] 👤 User profile:`, profile);
    
    // Get ALL conversation history
    const history = await getConversationHistory(USER_UUID);
    console.log(`[${timestamp}] 📚 Full conversation history:`, {
      messageCount: history?.length || 0,
      messages: history
    });
    
    // Analyze the conversation data
    const analysis = analyzeConversationData(history);
    
    const debugData = {
      timestamp,
      user_uuid: USER_UUID,
      profile_exists: !!profile,
      total_messages: history?.length || 0,
      analysis,
      raw_messages: history?.map((msg, index) => ({
        index,
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp,
        stage: msg.stage,
        conversation_id: msg.conversation_id
      })) || []
    };
    
    console.log(`[${timestamp}] 📊 Debug analysis:`, analysis);
    
    return res.status(200).json(debugData);
    
  } catch (error) {
    console.error(`[${timestamp}] ❌ Debug error:`, error);
    return res.status(500).json({ 
      error: 'Debug failed',
      message: error.message,
      timestamp 
    });
  }
}

function analyzeConversationData(history) {
  if (!history || history.length === 0) {
    return { summary: 'No conversation history found' };
  }
  
  const userMessages = history.filter(msg => msg.type === 'user');
  const assistantMessages = history.filter(msg => msg.type === 'assistant');
  
  const topics = extractTopics(userMessages);
  const conversationIds = [...new Set(history.map(msg => msg.conversation_id).filter(Boolean))];
  
  return {
    total_messages: history.length,
    user_messages: userMessages.length,
    assistant_messages: assistantMessages.length,
    unique_conversation_ids: conversationIds.length,
    conversation_ids: conversationIds,
    user_topics: topics,
    recent_user_messages: userMessages.slice(-5).map(msg => ({
      content: msg.content,
      timestamp: msg.timestamp
    })),
    oldest_message: history[0]?.timestamp,
    newest_message: history[history.length - 1]?.timestamp
  };
}

function extractTopics(userMessages) {
  return userMessages.map(msg => {
    const content = msg.content?.toLowerCase() || '';
    const topics = [];
    
    if (content.includes('wife')) topics.push('wife');
    if (content.includes('work')) topics.push('work');
    if (content.includes('family')) topics.push('family');
    if (content.includes('emotion')) topics.push('emotions');
    if (content.includes('summarize') || content.includes('summary')) topics.push('summary_request');
    
    return {
      content: msg.content,
      topics: topics,
      timestamp: msg.timestamp
    };
  });
}
