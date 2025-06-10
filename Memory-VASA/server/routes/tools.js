import express from 'express';
import { initializeToolsWithFirebase, getTools } from './index.js';
// Add these imports for database functions
import { 
  addConversation, 
  getUserConversations, 
  createOrUpdateUserProfile,
  updateConversationSession 
} from '../../lib/db.js';

const router = express.Router();

// Store reference to Firebase service
let firebaseService = null;

// Initialize tools with Firebase service
export { initializeToolsWithFirebase };

export function setFirebaseService(service) {
  firebaseService = service;
  initializeToolsWithFirebase(service);
  console.log('🔥 Tools router initialized with Firebase service');
}

// Route to execute context tool
router.post('/context', async (req, res) => {
  try {
    if (!firebaseService) {
      return res.status(500).json({
        error: 'Firebase service not initialized'
      });
    }

    const tools = getTools();
    if (!tools || !tools.get_user_context) {
      return res.status(500).json({
        error: 'Context tool not available'
      });
    }

    const { user_id, context_type = 'all', limit = 10 } = req.body;

    if (!user_id) {
      return res.status(400).json({
        error: 'user_id is required'
      });
    }

    // Your existing context logic here...
    
  } catch (error) {
    console.error('Error executing context tool:', error);
    res.status(500).json({
      error: 'Failed to execute context tool',
      details: error.message
    });
  }
});

// ============================================================================
// NEW MEMORY STORAGE ROUTES
// ============================================================================

// Route to save a VASA memory/conversation
router.post('/save-memory', async (req, res) => {
  try {
    const { userUUID, content, type = 'memory', metadata = {} } = req.body;

    if (!userUUID || !content) {
      return res.status(400).json({
        error: 'userUUID and content are required'
      });
    }

    // Save the memory/conversation
    const conversationId = await addConversation(userUUID, {
      type,
      content,
      metadata: {
        source: 'vasa_app',
        ...metadata
      }
    });

    // Update user session
    await updateConversationSession(userUUID, {
      messageCount: 1, // You might want to increment this properly
      lastMessageType: type
    });

    console.log(`✅ Memory saved for user ${userUUID}: ${conversationId}`);

    res.json({ 
      success: true, 
      conversationId,
      message: 'Memory saved successfully'
    });

  } catch (error) {
    console.error('Error saving memory:', error);
    res.status(500).json({
      error: 'Failed to save memory',
      details: error.message
    });
  }
});

// Route to get user's memories/conversations
router.get('/memories/:userUUID', async (req, res) => {
  try {
    const { userUUID } = req.params;
    const { limit = 50, type } = req.query;

    if (!userUUID) {
      return res.status(400).json({
        error: 'userUUID is required'
      });
    }

    // Get user's memories
    let memories = await getUserConversations(userUUID);
    
    // Filter by type if specified
    if (type) {
      memories = memories.filter(memory => memory.type === type);
    }
    
    // Limit results
    memories = memories.slice(0, parseInt(limit));

    console.log(`✅ Retrieved ${memories.length} memories for user ${userUUID}`);

    res.json({ 
      success: true, 
      memories,
      count: memories.length
    });

  } catch (error) {
    console.error('Error retrieving memories:', error);
    res.status(500).json({
      error: 'Failed to retrieve memories',
      details: error.message
    });
  }
});

// Route to save user profile
router.post('/profile', async (req, res) => {
  try {
    const { userUUID, ...profileData } = req.body;

    if (!userUUID) {
      return res.status(400).json({
        error: 'userUUID is required'
      });
    }

    await createOrUpdateUserProfile(userUUID, profileData);

    console.log(`✅ Profile updated for user ${userUUID}`);

    res.json({ 
      success: true, 
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      details: error.message
    });
  }
});

// Route to save conversation context (for AI context)
router.post('/context-save', async (req, res) => {
  try {
    const { userUUID, messages, sessionData } = req.body;

    if (!userUUID) {
      return res.status(400).json({
        error: 'userUUID is required'
      });
    }

    // Save each message in the conversation
    if (messages && Array.isArray(messages)) {
      for (const message of messages) {
        await addConversation(userUUID, {
          type: 'conversation',
          content: message.content,
          role: message.role, // 'user' or 'assistant'
          metadata: {
            source: 'vasa_conversation',
            timestamp: message.timestamp || new Date().toISOString()
          }
        });
      }
    }

    // Update session data
    if (sessionData) {
      await updateConversationSession(userUUID, sessionData);
    }

    console.log(`✅ Conversation context saved for user ${userUUID}`);

    res.json({ 
      success: true, 
      message: 'Conversation context saved successfully'
    });

  } catch (error) {
    console.error('Error saving conversation context:', error);
    res.status(500).json({
      error: 'Failed to save conversation context',
      details: error.message
    });
  }
});

export default router;
