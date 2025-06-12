import { getBrowserMemoryManager } from './BrowserMemoryHooks.js';

class MemoryManager {
  constructor() {
    this.browserMemory = getBrowserMemoryManager();
    this.isInitialized = false;
    this.initializeManager();
  }

  static getInstance() {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  async initializeManager() {
    try {
      this.isInitialized = true;
      console.log('✅ MemoryManager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize MemoryManager:', error);
      this.isInitialized = false;
    }
  }

  // Conversation history management
  async getConversationHistory(userUUID, limit = 50) {
    try {
      if (!this.isInitialized) {
        console.warn('MemoryManager not initialized, attempting to initialize...');
        await this.initializeManager();
      }

      const result = await this.browserMemory.getConversationHistory(userUUID, limit);
      
      if (result.requires_profile_creation) {
        return [];
      }
      
      return result.conversations || [];
    } catch (error) {
      console.error('❌ Failed to get conversation history:', error);
      return [];
    }
  }

  // FIXED: Added missing getConversationContext method
  async getConversationContext(userUUID) {
    try {
      if (!this.isInitialized) {
        await this.initializeManager();
      }

      // Get recent conversations and current stage for context
      const [conversationResult, currentStage] = await Promise.all([
        this.browserMemory.getConversationHistory(userUUID, 5),
        this.browserMemory.getCurrentStage(userUUID)
      ]);

      const recentConversations = conversationResult.conversations || [];
      
      // Build conversation context
      const context = {
        userUUID,
        currentStage: currentStage?.stage_name || 'pointed_origin',
        recentMessages: recentConversations.map(conv => ({
          id: conv.id,
          content: conv.conversation_thread?.[0]?.message || '',
          sender: conv.conversation_thread?.[0]?.sender || 'unknown',
          timestamp: conv.conversation_thread?.[0]?.timestamp || conv.created_at,
          stage_focus: conv.conversation_thread?.[0]?.stage_focus || 'general'
        })),
        sessionActive: currentStage?.started && !currentStage?.completed,
        lastActiveStage: currentStage?.stage_symbol || 'Ⓞ',
        conversationCount: recentConversations.length,
        contextType: 'therapeutic_session',
        generatedAt: new Date().toISOString()
      };

      console.log('✅ Conversation context generated:', context);
      return context;
    } catch (error) {
      console.error('❌ Failed to get conversation context:', error);
      return {
        userUUID,
        currentStage: 'pointed_origin',
        recentMessages: [],
        sessionActive: false,
        lastActiveStage: 'Ⓞ',
        conversationCount: 0,
        contextType: 'therapeutic_session',
        generatedAt: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // Store conversation
  async storeConversation(userUUID, conversationData) {
    try {
      if (!this.isInitialized) {
        await this.initializeManager();
      }

      const result = await this.browserMemory.storeConversation(userUUID, conversationData);
      
      if (result.success) {
        console.log('✅ Conversation stored successfully');
        return true;
      } else {
        console.warn('⚠️ Conversation storage failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to store conversation:', error);
      return false;
    }
  }

  // User profile management
  async getUserProfile(userUUID) {
    try {
      if (!this.isInitialized) {
        await this.initializeManager();
      }

      const result = await this.browserMemory.getUserProfile(userUUID);
      
      if (result.success && result.exists) {
        return result.profile;
      } else {
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to get user profile:', error);
      return null;
    }
  }

  async storeUserProfile(userUUID, profileData) {
    try {
      if (!this.isInitialized) {
        await this.initializeManager();
      }

      // Use the createNewUser method instead of storeUserProfile to avoid blocking
      const result = await this.browserMemory.createNewUser(userUUID, profileData);
      
      if (result.success) {
        console.log('✅ User profile created successfully');
        return result;
      } else {
        console.warn('⚠️ User profile creation failed:', result.error);
        return result;
      }
    } catch (error) {
      console.error('❌ Failed to store user profile:', error);
      return { success: false, error: error.message };
    }
  }

  // Stage progression management
  async storeStageProgression(userUUID, stageData) {
    try {
      if (!this.isInitialized) {
        await this.initializeManager();
      }

      const result = await this.browserMemory.updateStageProgression(
        userUUID, 
        stageData.stage_name || stageData.stageName, 
        stageData
      );
      
      return result.success;
    } catch (error) {
      console.error('❌ Failed to store stage progression:', error);
      return false;
    }
  }

  // User context storage
  async storeUserContext(userUUID, contextData) {
    try {
      if (!this.isInitialized) {
        await this.initializeManager();
      }

      // Store as a conversation with context type
      const result = await this.browserMemory.storeConversation(userUUID, {
        type: 'context',
        content: contextData.message || JSON.stringify(contextData),
        message_type: 'context',
        stage: contextData.stage || 'pointed_origin',
        context_data: contextData
      });
      
      return result.success;
    } catch (error) {
      console.error('❌ Failed to store user context:', error);
      return false;
    }
  }

  // GDPR compliance - clear user data
  async clearUserData(userUUID) {
    try {
      if (!this.isInitialized) {
        await this.initializeManager();
      }

      // BrowserMemoryHooks doesn't have clearUserData, so we'll implement a basic version
      console.log(`🗑️ Clearing user data for: ${userUUID}`);
      
      // Clear localStorage as a fallback measure
      const storageKey = `memory_vasa_${userUUID}`;
      localStorage.removeItem(storageKey);
      
      console.log('✅ User data cleared from localStorage');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear user data:', error);
      return false;
    }
  }

  // Health check
  async healthCheck() {
    try {
      return {
        status: 'healthy',
        service: 'browser-memory',
        initialized: this.isInitialized,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'browser-memory',
        initialized: this.isInitialized,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // User setup status
  async getUserSetupStatus(userUUID) {
    try {
      if (!this.isInitialized) {
        await this.initializeManager();
      }

      return await this.browserMemory.getUserSetupStatus(userUUID);
    } catch (error) {
      console.error('❌ Failed to get user setup status:', error);
      return {
        profile_exists: false,
        setup_completed: false,
        current_stage: null,
        requires_profile_creation: true,
        requires_setup_completion: false,
        user_data: null,
        error: error.message
      };
    }
  }

  // Create new user
  async createNewUser(userUUID, profileData = {}) {
    try {
      if (!this.isInitialized) {
        await this.initializeManager();
      }

      return await this.browserMemory.createNewUser(userUUID, profileData);
    } catch (error) {
      console.error('❌ Failed to create new user:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
const memoryManagerInstance = MemoryManager.getInstance();

export default memoryManagerInstance;
export { MemoryManager };
