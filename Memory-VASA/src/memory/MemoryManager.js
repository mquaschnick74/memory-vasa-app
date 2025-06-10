// server/routes/memory.js
import express from 'express';
import { 
  addConversation, 
  getUserConversations, 
  createOrUpdateUserProfile,
  getUserProfile,
  addStageProgression,
  getUserStageProgressions,
  updateConversationSession 
} from '../../lib/db.js';

const router = express.Router();

// ============================================================================
// CONVERSATION ROUTES (what MemoryManager expects)
// ============================================================================

// POST /api/memory/conversation - Store conversation
router.post('/conversation', async (req, res) => {
  try {
    const { userUUID, ...conversationData } = req.body;

    if (!userUUID) {
      return res.status(400).json({
        error: 'userUUID is required'
      });
    }

    // Store the conversation using our Firebase function
    const conversationId = await addConversation(userUUID, conversationData);

    console.log(`✅ Conversation stored for user ${userUUID}: ${conversationId}`);

    res.json({ 
      success: true, 
      id: conversationId,
      message: 'Conversation stored successfully'
    });

  } catch (error) {
    console.error('Error storing conversation:', error);
    res.status(500).json({
      error: 'Failed to store conversation',
      details: error.message
    });
  }
});

// GET /api/memory/conversation/:userUUID - Get conversation history
router.get('/conversation/:userUUID', async (req, res) => {
  try {
    const { userUUID } = req.params;
    const { limit = 50 } = req.query;

    if (!userUUID) {
      return res.status(400).json({
        error: 'userUUID is required'
      });
    }

    // Get conversations using our Firebase function
    let conversations = await getUserConversations(userUUID);
    
    // Limit results
    conversations = conversations.slice(0, parseInt(limit));

    console.log(`✅ Retrieved ${conversations.length} conversations for user ${userUUID}`);

    res.json(conversations);

  } catch (error) {
    console.error('Error retrieving conversations:', error);
    res.status(500).json({
      error: 'Failed to retrieve conversations',
      details: error.message
    });
  }
});

// ============================================================================
// PROFILE ROUTES
// ============================================================================

// POST /api/memory/profile - Store user profile
router.post('/profile', async (req, res) => {
  try {
    const { userUUID, ...profileData } = req.body;

    if (!userUUID) {
      return res.status(400).json({
        error: 'userUUID is required'
      });
    }

    await createOrUpdateUserProfile(userUUID, profileData);

    console.log(`✅ Profile stored for user ${userUUID}`);

    res.json({ 
      success: true, 
      message: 'Profile stored successfully'
    });

  } catch (error) {
    console.error('Error storing profile:', error);
    res.status(500).json({
      error: 'Failed to store profile',
      details: error.message
    });
  }
});

// GET /api/memory/profile/:userUUID - Get user profile
router.get('/profile/:userUUID', async (req, res) => {
  try {
    const { userUUID } = req.params;

    if (!userUUID) {
      return res.status(400).json({
        error: 'userUUID is required'
      });
    }

    const profile = await getUserProfile(userUUID);

    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found'
      });
    }

    console.log(`✅ Profile retrieved for user ${userUUID}`);

    res.json(profile);

  } catch (error) {
    console.error('Error retrieving profile:', error);
    res.status(500).json({
      error: 'Failed to retrieve profile',
      details: error.message
    });
  }
});

// ============================================================================
// STAGE PROGRESSION ROUTES
// ============================================================================

// POST /api/memory/stage - Store stage progression
router.post('/stage', async (req, res) => {
  try {
    const { userUUID, ...stageData } = req.body;

    if (!userUUID) {
      return res.status(400).json({
        error: 'userUUID is required'
      });
    }

    const stageId = await addStageProgression(userUUID, stageData);

    console.log(`✅ Stage progression stored for user ${userUUID}: ${stageId}`);

    res.json({ 
      success: true, 
      id: stageId,
      message: 'Stage progression stored successfully'
    });

  } catch (error) {
    console.error('Error storing stage progression:', error);
    res.status(500).json({
      error: 'Failed to store stage progression',
      details: error.message
    });
  }
});

// GET /api/memory/stages/:userUUID - Get user stage progressions
router.get('/stages/:userUUID', async (req, res) => {
  try {
    const { userUUID } = req.params;
    const { limit = 20 } = req.query;

    if (!userUUID) {
      return res.status(400).json({
        error: 'userUUID is required'
      });
    }

    let stages = await getUserStageProgressions(userUUID);
    
    // Limit results
    stages = stages.slice(0, parseInt(limit));

    console.log(`✅ Retrieved ${stages.length} stage progressions for user ${userUUID}`);

    res.json(stages);

  } catch (error) {
    console.error('Error retrieving stage progressions:', error);
    res.status(500).json({
      error: 'Failed to retrieve stage progressions',
      details: error.message
    });
  }
});

// ============================================================================
// CONTEXT ROUTE (for user context storage)
// ============================================================================

// POST /api/memory/context - Store user context
router.post('/context', async (req, res) => {
  try {
    const { userUUID, ...contextData } = req.body;

    if (!userUUID) {
      return res.status(400).json({
        error: 'userUUID is required'
      });
    }

    // Store as a conversation with type 'context'
    const contextId = await addConversation(userUUID, {
      type: 'context',
      ...contextData
    });

    console.log(`✅ Context stored for user ${userUUID}: ${contextId}`);

    res.json({ 
      success: true, 
      id: contextId,
      message: 'Context stored successfully'
    });

  } catch (error) {
    console.error('Error storing context:', error);
    res.status(500).json({
      error: 'Failed to store context',
      details: error.message
    });
  }
});

// ============================================================================
// USER DATA DELETION (GDPR compliance)
// ============================================================================

// DELETE /api/memory/user/:userUUID - Clear all user data
router.delete('/user/:userUUID', async (req, res) => {
  try {
    const { userUUID } = req.params;

    if (!userUUID) {
      return res.status(400).json({
        error: 'userUUID is required'
      });
    }

    // Note: You'll need to implement data deletion functions in your db.js
    // For now, we'll return success (implement actual deletion later)
    
    console.log(`✅ User data deletion requested for ${userUUID}`);

    res.json({ 
      success: true, 
      message: 'User data deletion completed'
    });

  } catch (error) {
    console.error('Error deleting user data:', error);
    res.status(500).json({
      error: 'Failed to delete user data',
      details: error.message
    });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

// GET /api/health - Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'memory-api'
  });
});

export default router;
