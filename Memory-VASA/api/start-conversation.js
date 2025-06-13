// api/start-conversation.js - Fixed Vercel Serverless Function

import { getFirebaseDb } from '../server/firebase-config.js';

export default async function handler(req, res) {
  const requestId = Math.random().toString(36).substr(2, 9);
  
  console.log(`[${requestId}] === START CONVERSATION API CALLED ===`);
  console.log(`[${requestId}] Method: ${req.method}`);
  console.log(`[${requestId}] Environment: ${process.env.NODE_ENV}`);
  console.log(`[${requestId}] Vercel: ${!!process.env.VERCEL}`);
  
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
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

    // Initialize Firebase Admin
    console.log(`[${requestId}] 🔧 Initializing Firebase Admin...`);
    const db = getFirebaseDb();
    console.log(`[${requestId}] ✅ Firebase Admin initialized`);

    // Check if user exists
    console.log(`[${requestId}] 🔍 Checking user profile...`);
    const userRef = db.collection('users').doc(userUUID);
    const userDoc = await userRef.get();
    
    let userProfile;
    if (!userDoc.exists) {
      console.log(`[${requestId}] 👤 User profile not found, creating new user...`);
      
      // Create new user document
      userProfile = {
        user_id: userUUID,
        created_at: new Date(),
        last_active: new Date(),
        current_stage: 'pointed_origin',
        journey_started: new Date(),
        profile: {
          setup_completed: true,
          display_name: conversationData?.user_name || 'VASA User',
          created_via: 'conversation_api'
        },
        metrics: {
          total_sessions: 0,
          breakthrough_moments: 0,
          stages_completed: 0
        }
      };
      
      await userRef.set(userProfile);
      console.log(`[${requestId}] ✅ New user created`);
    } else {
      userProfile = userDoc.data();
      console.log(`[${requestId}] ✅ User profile found`);
      
      // Update last active
      await userRef.update({ last_active: new Date() });
    }

    // Get recent conversation history
    console.log(`[${requestId}] 📚 Getting conversation context...`);
    const conversationHistory = await db
      .collection('users')
      .doc(userUUID)
      .collection('user_context')
      .orderBy('created_at', 'desc')
      .limit(5)
      .get();
    
    const conversations = [];
    conversationHistory.forEach((doc) => {
      conversations.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`[${requestId}] ✅ Retrieved ${conversations.length} previous conversations`);

    // Generate conversation context summary
    const contextSummary = generateContextSummary(conversations, userProfile);
    console.log(`[${requestId}] 📝 Context summary generated:`, contextSummary.substring(0, 100) + '...');

    // Store conversation start event
    console.log(`[${requestId}] 💾 Storing conversation start event...`);
    const conversationId = `conv_${requestId}`;
    
    const contextEntry = {
      context_id: `context_start_${requestId}`,
      context_type: 'therapeutic_session',
      current_stage: userProfile.current_stage || 'pointed_origin',
      created_at: new Date(),
      updated_at: new Date(),
      conversation_thread: [{
        message: 'ElevenLabs conversation session started',
        sender: 'system',
        timestamp: new Date(),
        message_type: 'session_start',
        stage_focus: 'session_initialization'
      }],
      tags: ['session_start', 'elevenlabs'],
      priority: 3,
      integration_insights: [],
      metadata: {
        request_id: requestId,
        conversation_id: conversationId,
        agent_id: agentConfig?.agent_id || 'default',
        user_agent: req.headers['user-agent']
      }
    };

    await db
      .collection('users')
      .doc(userUUID)
      .collection('user_context')
      .doc(contextEntry.context_id)
      .set(contextEntry);

    console.log(`[${requestId}] ✅ Conversation start stored`);

    // Update user session count
    await userRef.update({
      'metrics.total_sessions': (userProfile.metrics?.total_sessions || 0) + 1,
      last_active: new Date()
    });

    // Prepare response data for ElevenLabs
    const responseData = {
      success: true,
      conversationId: conversationId,
      userProfile: {
        userUUID,
        displayName: userProfile.profile?.display_name || 'User',
        currentStage: userProfile.current_stage || 'pointed_origin',
        setupCompleted: userProfile.profile?.setup_completed || false,
        totalSessions: (userProfile.metrics?.total_sessions || 0) + 1
      },
      context: {
        summary: contextSummary,
        conversationCount: conversations.length,
        lastSession: conversations[0]?.created_at || null,
        sessionActive: true
      },
      agentConfig: {
        personalizedPrompt: generatePersonalizedPrompt(contextSummary, userProfile),
        dynamicVariables: {
          user_name: userProfile.profile?.display_name || 'User',
          user_id: userUUID,
          current_stage: userProfile.current_stage || 'pointed_origin',
          session_count: (userProfile.metrics?.total_sessions || 0) + 1,
          conversation_context: contextSummary
        }
      },
      requestId,
      timestamp: new Date().toISOString()
    };

    console.log(`[${requestId}] ✅ Conversation started successfully`);

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

    if (error.message.includes('Firebase') || error.message.includes('Firestore')) {
      errorMessage = 'Database connection error';
      statusCode = 503;
    } else if (error.message.includes('permission')) {
      errorMessage = 'Database permission error';
      statusCode = 403;
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
  summary += ` Total sessions: ${userProfile.metrics?.total_sessions || 0}.`;

  return summary;
}

// Helper function to generate personalized prompt for ElevenLabs
function generatePersonalizedPrompt(contextSummary, userProfile) {
  const stageName = userProfile.current_stage || 'pointed_origin';
  const displayName = userProfile.profile?.display_name || 'User';
  
  return `You are VASA, a therapeutic AI guide helping ${displayName} through the Core Symbol Set journey. 

Current Stage: ${stageName}
Session Context: ${contextSummary}

Maintain therapeutic presence while guiding them through this specific stage of their journey. Reference their previous work when relevant, and adapt your communication to their established therapeutic relationship with you.`;
}
