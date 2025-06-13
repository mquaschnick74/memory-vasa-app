// api/start-conversation.js
import { getMemoryManager } from '../server/MemoryManager.js';

export default async function handler(req, res) {
  const requestId = Math.random().toString(36).substr(2, 9);
  
  console.log(`[${requestId}] === START CONVERSATION API CALLED ===`);
  console.log(`[${requestId}] Method: ${req.method}`);
  console.log(`[${requestId}] Environment: ${process.env.NODE_ENV}`);
  console.log(`[${requestId}] User Agent: ${req.headers['user-agent']}`);
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log(`[${requestId}] ❌ Method not allowed: ${req.method}`);
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethods: ['POST'],
      requestId 
    });
  }

  try {
    // Parse request body
    const { userUUID, conversationData, agentConfig } = req.body;
    
    console.log(`[${requestId}] Request data:`, {
      hasUserUUID: !!userUUID,
      hasConversationData: !!conversationData,
      hasAgentConfig: !!agentConfig,
      userUUID: userUUID || 'MISSING'
    });

    // Validate required fields
    if (!userUUID) {
      console.log(`[${requestId}] ❌ Missing userUUID`);
      return res.status(400).json({
        error: 'Missing required field: userUUID',
        requestId
      });
    }

    // Initialize memory manager
    console.log(`[${requestId}] 🔧 Initializing memory manager...`);
    const memoryManager = getMemoryManager();
    await memoryManager.initialize();
    console.log(`[${requestId}] ✅ Memory manager initialized`);

    // Check if user exists, create if needed
    console.log(`[${requestId}] 🔍 Checking user profile...`);
    let userProfile = await memoryManager.getUserProfile(userUUID);
    
    if (!userProfile) {
      console.log(`[${requestId}] 👤 User profile not found, creating new user...`);
      const createResult = await memoryManager.createNewUser(userUUID, {
        display_name: conversationData?.user_name || 'VASA User',
        created_via: 'conversation_api'
      });
      
      if (!createResult.success) {
        throw new Error(`Failed to create user: ${createResult.error}`);
      }
      
      console.log(`[${requestId}] ✅ New user created`);
      userProfile = await memoryManager.getUserProfile(userUUID);
    } else {
      console.log(`[${requestId}] ✅ User profile found`);
    }

    // Get conversation context for personalization
    console.log(`[${requestId}] 📚 Getting conversation context...`);
    const conversationHistory = await memoryManager.getConversationHistory(userUUID, 5);
    console.log(`[${requestId}] ✅ Retrieved ${conversationHistory.length} previous conversations`);

    // Generate conversation context summary
    const contextSummary = generateContextSummary(conversationHistory, userProfile);
    console.log(`[${requestId}] 📝 Context summary generated:`, contextSummary.substring(0, 100) + '...');

    // Store conversation start event
    console.log(`[${requestId}] 💾 Storing conversation start event...`);
    const storeResult = await memoryManager.storeConversation(userUUID, {
      type: 'system',
      content: 'Conversation session started',
      message_type: 'session_start',
      stage: userProfile.current_stage || 'pointed_origin',
      conversation_id: `conv_${requestId}`,
      agent_id: agentConfig?.agent_id || 'default',
      metadata: {
        request_id: requestId,
        user_agent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      }
    });

    if (!storeResult.success) {
      console.warn(`[${requestId}] ⚠️ Failed to store conversation start: ${storeResult.error}`);
    } else {
      console.log(`[${requestId}] ✅ Conversation start stored`);
    }

    // Prepare response data
    const responseData = {
      success: true,
      conversationId: `conv_${requestId}`,
      userProfile: {
        userUUID,
        displayName: userProfile.profile?.personal_info?.display_name || 'User',
        currentStage: userProfile.current_stage || 'pointed_origin',
        setupCompleted: userProfile.profile?.setup_completed || false,
        totalSessions: userProfile.metrics?.total_sessions || 0
      },
      context: {
        summary: contextSummary,
        conversationCount: conversationHistory.length,
        lastSession: conversationHistory[0]?.created_at || null,
        sessionActive: true
      },
      agentConfig: {
        personalizedPrompt: generatePersonalizedPrompt(contextSummary, userProfile),
        dynamicVariables: {
          user_name: userProfile.profile?.personal_info?.display_name || 'User',
          user_id: userUUID,
          current_stage: userProfile.current_stage || 'pointed_origin',
          session_count: userProfile.metrics?.total_sessions || 0,
          conversation_context: contextSummary
        }
      },
      requestId,
      timestamp: new Date().toISOString()
    };

    console.log(`[${requestId}] ✅ Conversation started successfully`);
    console.log(`[${requestId}] Response data:`, {
      conversationId: responseData.conversationId,
      userUUID: responseData.userProfile.userUUID,
      currentStage: responseData.userProfile.currentStage,
      contextLength: responseData.context.summary.length
    });

    return res.status(200).json(responseData);

  } catch (error) {
    console.error(`[${requestId}] ❌ Start conversation API error:`, {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    // Categorize errors for better debugging
    let errorMessage = 'Internal server error';
    let statusCode = 500;

    if (error.message.includes('Firebase')) {
      errorMessage = 'Database connection error';
      statusCode = 503;
    } else if (error.message.includes('Memory')) {
      errorMessage = 'Memory service initialization error';
      statusCode = 503;
    } else if (error.message.includes('User')) {
      errorMessage = 'User management error';
      statusCode = 400;
    }

    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code,
        stack: error.stack
      } : undefined,
      requestId
    });
  }
}

// Helper function to generate context summary
function generateContextSummary(conversationHistory, userProfile) {
  if (!conversationHistory || conversationHistory.length === 0) {
    return `New therapeutic session beginning. User is at ${userProfile.current_stage || 'pointed_origin'} stage of the Core Symbol Set journey.`;
  }

  // Extract recent messages
  const recentMessages = conversationHistory.slice(0, 3).map(conv => {
    const thread = conv.conversation_thread?.[0];
    if (thread && thread.sender === 'user') {
      return thread.message.substring(0, 100);
    }
    return null;
  }).filter(Boolean);

  let summary = `Continuing therapeutic session. `;
  
  if (recentMessages.length > 0) {
    summary += `Recent themes from previous sessions: ${recentMessages.join('; ')}.`;
  }
  
  summary += ` User is currently in ${userProfile.current_stage || 'pointed_origin'} stage. `;
  summary += `Total sessions: ${userProfile.metrics?.total_sessions || 0}.`;

  return summary;
}

// Helper function to generate personalized prompt
function generatePersonalizedPrompt(contextSummary, userProfile) {
  const stageName = userProfile.current_stage || 'pointed_origin';
  const displayName = userProfile.profile?.personal_info?.display_name || 'User';
  
  return `You are VASA, a therapeutic AI guide helping ${displayName} through the Core Symbol Set journey. 

Current Stage: ${stageName}
Session Context: ${contextSummary}

Maintain therapeutic presence while guiding them through this specific stage of their journey. Reference their previous work when relevant, and adapt your communication to their established therapeutic relationship with you.`;
}
