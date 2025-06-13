// server/MemoryManager.js
import { getFirebaseDb } from '../lib/firebase-admin.js';

export class MemoryManager {
  constructor() {
    this.db = null;
    this.initialized = false;
    console.log('🔧 MemoryManager constructor called');
  }

  async initialize() {
    if (this.initialized) {
      console.log('✅ MemoryManager already initialized');
      return;
    }
    
    try {
      console.log('🔧 Initializing MemoryManager...');
      
      // Get Firebase database instance
      this.db = getFirebaseDb();
      this.initialized = true;
      
      console.log('✅ MemoryManager initialized with Firestore');
    } catch (error) {
      console.error('❌ MemoryManager initialization failed:', error);
      throw new Error(`MemoryManager initialization failed: ${error.message}`);
    }
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  async getConversationHistory(userUUID, limit = 50) {
    console.log(`🔍 Getting conversation history for user: ${userUUID}, limit: ${limit}`);
    
    try {
      await this.ensureInitialized();
      
      const snapshot = await this.db
        .collection('users')
        .doc(userUUID)
        .collection('user_context')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .get();
      
      const conversations = [];
      snapshot.forEach((doc) => {
        conversations.push({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at?.toDate?.() || doc.data().created_at
        });
      });
      
      console.log(`✅ Retrieved ${conversations.length} conversations for user: ${userUUID}`);
      return conversations;
      
    } catch (error) {
      console.error(`❌ Failed to get conversation history for user ${userUUID}:`, error);
      throw error;
    }
  }

  async getUserProfile(userUUID) {
    console.log(`🔍 Getting user profile for: ${userUUID}`);
    
    try {
      await this.ensureInitialized();
      
      const userDoc = await this.db
        .collection('users')
        .doc(userUUID)
        .get();
      
      if (userDoc.exists) {
        const profile = userDoc.data();
        console.log(`✅ User profile found for: ${userUUID}`);
        return profile;
      } else {
        console.log(`ℹ️ No user profile found for: ${userUUID}`);
        return null;
      }
      
    } catch (error) {
      console.error(`❌ Failed to get user profile for ${userUUID}:`, error);
      throw error;
    }
  }

  async storeConversation(userUUID, conversationData) {
    console.log(`💾 Storing conversation for user: ${userUUID}`);
    
    try {
      await this.ensureInitialized();
      
      // Create context entry structure matching your existing format
      const contextId = `context_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const contextEntry = {
        context_id: contextId,
        context_type: 'therapeutic_session',
        current_stage: conversationData.stage || 'pointed_origin',
        created_at: new Date(),
        updated_at: new Date(),
        conversation_thread: [
          {
            message: conversationData.content || conversationData.message,
            sender: conversationData.type === 'user' ? 'user' : 'assistant',
            timestamp: new Date(),
            message_type: conversationData.message_type || 'text',
            stage_focus: conversationData.stage_focus || 'general'
          }
        ],
        tags: [conversationData.stage || 'pointed_origin', 'therapeutic_session'],
        priority: 3,
        integration_insights: [],
        metadata: {
          source: 'server_memory_manager',
          conversation_id: conversationData.conversation_id,
          agent_id: conversationData.agent_id
        }
      };

      const docRef = await this.db
        .collection('users')
        .doc(userUUID)
        .collection('user_context')
        .doc(contextId)
        .set(contextEntry);
      
      console.log(`✅ Conversation stored for user: ${userUUID}, context ID: ${contextId}`);
      return { success: true, id: contextId };
      
    } catch (error) {
      console.error(`❌ Failed to store conversation for user ${userUUID}:`, error);
      throw error;
    }
  }

  async getUserStageProgressions(userUUID, limit = 20) {
    console.log(`🔍 Getting stage progressions for user: ${userUUID}`);
    
    try {
      await this.ensureInitialized();
      
      const snapshot = await this.db
        .collection('users')
        .doc(userUUID)
        .collection('stage_progressions')
        .orderBy('stage_level', 'asc')
        .limit(limit)
        .get();
      
      const stages = [];
      snapshot.forEach((doc) => {
        stages.push({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at?.toDate?.() || doc.data().created_at,
          updated_at: doc.data().updated_at?.toDate?.() || doc.data().updated_at
        });
      });
      
      console.log(`✅ Retrieved ${stages.length} stage progressions for user: ${userUUID}`);
      return stages;
      
    } catch (error) {
      console.error(`❌ Failed to get stage progressions for user ${userUUID}:`, error);
      throw error;
    }
  }

  async getUserContext(userUUID, limit = 20) {
    console.log(`🔍 Getting user context for: ${userUUID}`);
    
    try {
      await this.ensureInitialized();
      
      const snapshot = await this.db
        .collection('users')
        .doc(userUUID)
        .collection('user_context')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .get();
      
      const contexts = [];
      snapshot.forEach((doc) => {
        contexts.push({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at?.toDate?.() || doc.data().created_at
        });
      });
      
      console.log(`✅ Retrieved ${contexts.length} contexts for user: ${userUUID}`);
      return contexts;
      
    } catch (error) {
      console.error(`❌ Failed to get user context for ${userUUID}:`, error);
      throw error;
    }
  }

  async createNewUser(userUUID, profileData = {}) {
    console.log(`👤 Creating new user: ${userUUID}`);
    
    try {
      await this.ensureInitialized();
      
      // Create user document
      const userDoc = {
        user_id: userUUID,
        created_at: new Date(),
        last_active: new Date(),
        current_stage: 'pointed_origin',
        journey_started: new Date(),
        profile: {
          setup_completed: true,
          therapeutic_goals: profileData.therapeutic_goals || [],
          preferences: {
            session_length: profileData.session_length || 'standard',
            intensity: profileData.intensity || 'moderate',
            communication_style: profileData.communication_style || 'conversational',
            ...profileData.preferences
          },
          personal_info: {
            display_name: profileData.display_name || '',
            timezone: profileData.timezone || 'UTC',
            ...profileData.personal_info
          }
        },
        metrics: {
          total_sessions: 0,
          breakthrough_moments: 0,
          stages_completed: 0,
          integration_score: 0
        }
      };

      await this.db.collection('users').doc(userUUID).set(userDoc);
      
      console.log(`✅ New user created: ${userUUID}`);
      return { success: true, userUUID };
      
    } catch (error) {
      console.error(`❌ Failed to create user ${userUUID}:`, error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      await this.ensureInitialized();
      
      // Test basic database connectivity
      const testRef = this.db.collection('_health_check').doc('test');
      await testRef.set({ timestamp: new Date(), test: true });
      
      return {
        status: 'healthy',
        service: 'firebase-memory',
        initialized: this.initialized,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'firebase-memory',
        initialized: this.initialized,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
let memoryManagerInstance = null;

export function getMemoryManager() {
  if (!memoryManagerInstance) {
    console.log('🔧 Creating new MemoryManager singleton instance');
    memoryManagerInstance = new MemoryManager();
  }
  return memoryManagerInstance;
}

// Export singleton instance as default
export default getMemoryManager();
