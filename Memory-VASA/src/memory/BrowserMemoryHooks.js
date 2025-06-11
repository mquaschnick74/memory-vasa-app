import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import app from '../firebase-config.js';

class BrowserMemoryHooks {
  constructor() {
    this.db = getFirestore(app);
    this.localCache = new Map();
    this.maxCacheSize = 100;
    console.log('BrowserMemoryHooks initialized with Core Symbol Set Firebase structure');
  }

  // FIXED: createInitialUserContext method
  async createInitialUserContext(userUUID) {
    const initialContext = {
      context_id: 'context_initial',
      context_type: 'therapeutic_session',
      current_stage: 'pointed_origin',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      conversation_thread: [
        {
          message: "Welcome to your Memory VASA therapeutic journey. We'll guide you through the Core Symbol Set process starting with the Pointed Origin stage (Ⓞ) to identify your fragmentation patterns.",
          sender: 'assistant',
          timestamp: new Date(), // ✅ Use new Date() instead of serverTimestamp()
          message_type: 'text',
          stage_focus: 'journey_orientation'
        }
      ],
      tags: ['journey_start', 'pointed_origin'],
      priority: 3,
      integration_insights: ['User beginning Core Symbol Set journey']
    };

    await setDoc(
      doc(this.db, 'users', userUUID, 'user_context', 'context_initial'),
      initialContext
    );
    
    console.log(`✅ Initial user context created for: ${userUUID}`);
    return { success: true, id: 'context_initial' };
  }

  // FIXED: storeConversation method (with user check)
  async storeConversation(userUUID, conversationData) {
    try {
      // First check if user exists
      const userCheck = await this.checkUserProfile(userUUID);
      if (!userCheck.exists) {
        console.warn(`⚠️ Cannot store conversation - no user profile: ${userUUID}`);
        // Fallback to localStorage only
        this.fallbackToLocalStorage(userUUID, conversationData);
        return { 
          success: false, 
          error: 'User profile not found',
          requires_profile_creation: true,
          stored_locally: true
        };
      }

      // Get current stage if not provided
      const currentStage = await this.getCurrentStage(userUUID);
      const stage = conversationData.stage || currentStage?.stage_name || 'pointed_origin';

      const contextId = `context_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const contextData = {
        context_id: contextId,
        context_type: 'therapeutic_session',
        current_stage: stage,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        conversation_thread: [
          {
            message: conversationData.content || conversationData.message,
            sender: conversationData.type === 'user' ? 'user' : 'assistant',
            timestamp: new Date(), // ✅ Use new Date() instead of serverTimestamp()
            message_type: conversationData.message_type || 'text',
            stage_focus: this.getStageFocus(stage, conversationData.type)
          }
        ],
        tags: [stage, 'therapeutic_session'],
        priority: 3,
        integration_insights: []
      };

      const docRef = await addDoc(
        collection(this.db, 'users', userUUID, 'user_context'),
        contextData
      );

      // Add to local cache
      const memoryEntry = {
        userUUID,
        timestamp: new Date().toISOString(),
        id: docRef.id,
        ...conversationData
      };
      this.addToLocalCache(userUUID, memoryEntry);
      
      console.log(`✅ Conversation stored in user_context: ${docRef.id}`);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('❌ Failed to store conversation:', error);
      this.fallbackToLocalStorage(userUUID, conversationData);
      return { success: false, error: error.message };
    }
  }

  // Get current stage helper
  async getCurrentStage(userUUID) {
    try {
      const stageProgressionsRef = collection(this.db, 'users', userUUID, 'stage_progressions');
      const querySnapshot = await getDocs(stageProgressionsRef);
      
      const stages = [];
      querySnapshot.forEach((doc) => {
        stages.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Find first uncompleted stage, sorted by level
      const currentStage = stages
        .filter(stage => !stage.completed)
        .sort((a, b) => a.stage_level - b.stage_level)[0];
      
      return currentStage || null;
    } catch (error) {
      console.error('❌ Error getting current stage:', error);
      return null;
    }
  }

  // Get stage focus based on stage and message type
  getStageFocus(stage, messageType) {
    const stageFocusMap = {
      'pointed_origin': messageType === 'user' ? 'fragmentation_exploration' : 'pattern_identification',
      'focus_bind': messageType === 'user' ? 'attention_practice' : 'cvdc_introduction',
      'suspension': messageType === 'user' ? 'tension_holding' : 'liminality_navigation',
      'gesture_toward': messageType === 'user' ? 'direction_finding' : 'thend_facilitation',
      'completion': messageType === 'user' ? 'integration_work' : 'cyvc_cultivation',
      'terminal_symbol': messageType === 'user' ? 'meta_reflection' : 'journey_closure'
    };
    
    return stageFocusMap[stage] || 'general_therapeutic';
  }

  // Get user setup status (for UI to determine what to show)
  async getUserSetupStatus(userUUID) {
    try {
      const userCheck = await this.checkUserProfile(userUUID);
      
      return {
        profile_exists: userCheck.exists,
        setup_completed: userCheck.exists && userCheck.profile?.profile?.setup_completed,
        current_stage: userCheck.exists ? userCheck.profile?.current_stage : null,
        requires_profile_creation: !userCheck.exists,
        requires_setup_completion: userCheck.exists && !userCheck.profile?.profile?.setup_completed,
        user_data: userCheck.exists ? userCheck.profile : null
      };
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

  // Check if user profile exists
  async checkUserProfile(userUUID) {
    try {
      const userRef = doc(this.db, 'users', userUUID);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        console.log(`✅ User profile found for: ${userUUID}`);
        return { 
          exists: true, 
          profile: userSnap.data(),
          requiresSetup: !userSnap.data().profile?.setup_completed 
        };
      } else {
        console.log(`ℹ️ No user profile found for: ${userUUID}`);
        return { 
          exists: false, 
          profile: null,
          requiresSetup: true 
        };
      }
    } catch (error) {
      console.error('❌ Failed to check user profile:', error);
      return { 
        exists: false, 
        profile: null, 
        requiresSetup: true,
        error: error.message 
      };
    }
  }

  // Get user profile (missing method that was being called)
  async getUserProfile(userUUID) {
    try {
      const userRef = doc(this.db, 'users', userUUID);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        console.log(`✅ User profile loaded for: ${userUUID}`);
        return {
          success: true,
          profile: userData,
          exists: true,
          setup_completed: userData.profile?.setup_completed || false
        };
      } else {
        console.log(`ℹ️ No user profile found for: ${userUUID}`);
        return {
          success: false,
          profile: null,
          exists: false,
          setup_completed: false,
          requires_profile_creation: true
        };
      }
    } catch (error) {
      console.error('❌ Failed to get user profile:', error);
      return {
        success: false,
        profile: null,
        exists: false,
        setup_completed: false,
        requires_profile_creation: true,
        error: error.message
      };
    }
  }

  // Create new user with CSS structure (only when explicitly requested)
  async createNewUser(userUUID, profileData = {}) {
    try {
      // Create user document
      const userRef = doc(this.db, 'users', userUUID);
      await setDoc(userRef, {
        user_id: userUUID,
        created_at: serverTimestamp(),
        last_active: serverTimestamp(),
        current_stage: 'pointed_origin',
        journey_started: serverTimestamp(),
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
      });

      // Initialize stage progressions
      await this.initializeStageProgressions(userUUID);
      
      // Create initial context
      await this.createInitialUserContext(userUUID);
      
      console.log(`✅ New user created with CSS structure: ${userUUID}`);
      return { success: true, userUUID };
    } catch (error) {
      console.error('❌ Failed to create new user:', error);
      return { success: false, error: error.message };
    }
  }

  // Initialize all CSS stages
  async initializeStageProgressions(userUUID) {
    const stages = [
      {
        stage_name: 'pointed_origin',
        stage_symbol: 'Ⓞ',
        stage_level: 1,
        description: 'Revealing Fragmentation',
        objectives: ['Identify fragmentation patterns', 'Establish therapeutic connection', 'Begin symbol recognition'],
        completion_criteria: ['Fragmentation acknowledged', 'Initial patterns identified', 'Readiness for focus work'],
        completed: false,
        started: true,
        started_at: serverTimestamp(),
        therapeutic_focus: 'Pattern recognition and fragmentation awareness',
        integration_data: {}
      },
      {
        stage_name: 'focus_bind',
        stage_symbol: '•',
        stage_level: 2,
        description: 'Introducing CVDC',
        objectives: ['Develop focused attention', 'Introduce contradiction work', 'Build therapeutic container'],
        completion_criteria: ['Sustained attention achieved', 'CVDC understanding demonstrated', 'Container established'],
        completed: false,
        started: false,
        therapeutic_focus: 'Attention cultivation and contradiction introduction',
        integration_data: {}
      },
      {
        stage_name: 'suspension',
        stage_symbol: '_',
        stage_level: 3,
        description: 'Navigating Liminality',
        objectives: ['Hold contradictory states', 'Develop tolerance for uncertainty', 'Deepen therapeutic work'],
        completion_criteria: ['Contradiction tolerance developed', 'Liminality navigated', 'Deeper insights emerged'],
        completed: false,
        started: false,
        therapeutic_focus: 'Contradiction holding and liminal navigation',
        integration_data: {}
      },
      {
        stage_name: 'gesture_toward',
        stage_symbol: '1',
        stage_level: 4,
        description: 'Facilitating Thend',
        objectives: ['Direct movement toward integration', 'Facilitate therapeutic breakthrough', 'Develop forward momentum'],
        completion_criteria: ['Clear direction established', 'Breakthrough moments achieved', 'Integration beginning'],
        completed: false,
        started: false,
        therapeutic_focus: 'Directional movement and breakthrough facilitation',
        integration_data: {}
      },
      {
        stage_name: 'completion',
        stage_symbol: '2',
        stage_level: 5,
        description: 'Cultivating CYVC',
        objectives: ['Achieve therapeutic integration', 'Cultivate lasting change', 'Prepare for independence'],
        completion_criteria: ['Integration achieved', 'CYVC cultivated', 'Independence readiness'],
        completed: false,
        started: false,
        therapeutic_focus: 'Integration achievement and lasting change cultivation',
        integration_data: {}
      },
      {
        stage_name: 'terminal_symbol',
        stage_symbol: 'Ø',
        stage_level: 6,
        description: 'Meta-reflection',
        objectives: ['Reflect on entire journey', 'Consolidate learnings', 'Plan ongoing growth'],
        completion_criteria: ['Journey reflected upon', 'Learnings consolidated', 'Growth plan established'],
        completed: false,
        started: false,
        therapeutic_focus: 'Meta-reflection and journey consolidation',
        integration_data: {}
      }
    ];

    for (const stage of stages) {
      const stageId = `stage_${stage.stage_name}_${Date.now()}`;
      await setDoc(
        doc(this.db, 'users', userUUID, 'stage_progressions', stageId),
        {
          ...stage,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        }
      );
    }
    
    console.log(`✅ Stage progressions initialized for user: ${userUUID}`);
  }

  // Local cache management
  addToLocalCache(userUUID, memoryEntry) {
    if (!this.localCache.has(userUUID)) {
      this.localCache.set(userUUID, []);
    }
    
    const userCache = this.localCache.get(userUUID);
    userCache.push(memoryEntry);
    
    // Limit cache size
    if (userCache.length > this.maxCacheSize) {
      userCache.shift(); // Remove oldest entry
    }
  }

  // Fallback to localStorage when Firebase fails
  fallbackToLocalStorage(userUUID, conversationData) {
    try {
      const storageKey = `memory_vasa_${userUUID}`;
      const existingData = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      const memoryEntry = {
        ...conversationData,
        timestamp: new Date().toISOString(),
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        source: 'localStorage_fallback'
      };
      
      existingData.push(memoryEntry);
      
      // Keep only last 50 entries in localStorage
      if (existingData.length > 50) {
        existingData.splice(0, existingData.length - 50);
      }
      
      localStorage.setItem(storageKey, JSON.stringify(existingData));
      console.log(`✅ Fallback: Stored in localStorage for user: ${userUUID}`);
    } catch (error) {
      console.error('❌ Failed to store in localStorage fallback:', error);
    }
  }

  // Retrieve conversation history (with user check)
  async getConversationHistory(userUUID, limit = 20) {
    try {
      // First check if user exists
      const userCheck = await this.checkUserProfile(userUUID);
      if (!userCheck.exists) {
        console.log(`ℹ️ No user profile found for conversation history: ${userUUID}`);
        return {
          conversations: [],
          requires_profile_creation: true,
          message: 'Please create a user profile to access conversation history'
        };
      }

      const userContextRef = collection(this.db, 'users', userUUID, 'user_context');
      const q = query(
        userContextRef,
        orderBy('created_at', 'desc'),
        limit(limit)
      );
      
      const querySnapshot = await getDocs(q);
      const conversations = [];
      
      querySnapshot.forEach((doc) => {
        conversations.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`✅ Retrieved ${conversations.length} conversation messages from user_context`);
      return {
        conversations: conversations.reverse(), // Return in chronological order
        requires_profile_creation: false
      };
    } catch (error) {
      console.error('❌ Failed to get conversation history:', error);
      
      // Fallback to localStorage
      const storageKey = `memory_vasa_${userUUID}`;
      const localData = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return {
        conversations: localData.slice(-limit),
        requires_profile_creation: false,
        source: 'localStorage_fallback'
      };
    }
  }

  // Update stage progression
  async updateStageProgression(userUUID, stageName, progressData) {
    try {
      const stageProgressionsRef = collection(this.db, 'users', userUUID, 'stage_progressions');
      const q = query(stageProgressionsRef, where('stage_name', '==', stageName));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const stageDoc = querySnapshot.docs[0];
        await updateDoc(stageDoc.ref, {
          ...progressData,
          updated_at: serverTimestamp()
        });
        
        console.log(`✅ Stage progression updated: ${stageName}`);
        return { success: true };
      }
      
      return { success: false, error: 'Stage not found' };
    } catch (error) {
      console.error('❌ Failed to update stage progression:', error);
      return { success: false, error: error.message };
    }
  }

  // Complete a stage
  async completeStage(userUUID, stageName) {
    try {
      const result = await this.updateStageProgression(userUUID, stageName, {
        completed: true,
        completed_at: serverTimestamp()
      });
      
      if (result.success) {
        // Start next stage
        await this.startNextStage(userUUID, stageName);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Failed to complete stage:', error);
      return { success: false, error: error.message };
    }
  }

  // Start next stage
  async startNextStage(userUUID, completedStageName) {
    const stageOrder = [
      'pointed_origin',
      'focus_bind', 
      'suspension',
      'gesture_toward',
      'completion',
      'terminal_symbol'
    ];
    
    const currentIndex = stageOrder.indexOf(completedStageName);
    if (currentIndex >= 0 && currentIndex < stageOrder.length - 1) {
      const nextStageName = stageOrder[currentIndex + 1];
      
      await this.updateStageProgression(userUUID, nextStageName, {
        started: true,
        started_at: serverTimestamp()
      });
      
      console.log(`✅ Started next stage: ${nextStageName}`);
    }
  }

  // Get user metrics
  async getUserMetrics(userUUID) {
    try {
      const userRef = doc(this.db, 'users', userUUID);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return userSnap.data().metrics || {};
      }
      
      return {};
    } catch (error) {
      console.error('❌ Failed to get user metrics:', error);
      return {};
    }
  }

  // Update user profile setup status
  async completeProfileSetup(userUUID, additionalData = {}) {
    try {
      const userRef = doc(this.db, 'users', userUUID);
      await updateDoc(userRef, {
        'profile.setup_completed': true,
        'profile.setup_completed_at': serverTimestamp(),
        ...additionalData,
        last_active: serverTimestamp()
      });
      
      console.log(`✅ Profile setup completed for user: ${userUUID}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to complete profile setup:', error);
      return { success: false, error: error.message };
    }
  }

  // Store user profile (called by other parts of your app)
  async storeUserProfile(userUUID, profileData) {
    console.warn(`🚫 BLOCKED: Auto-profile creation attempted for: ${userUUID}`);
    console.warn('Profile data attempted:', profileData);
    console.warn('Use createNewUser() method instead through proper UI flow');
    
    // Return error to prevent auto-creation and force proper profile creation flow
    return {
      success: false,
      error: 'Auto-profile creation disabled. Use profile creation UI.',
      requires_profile_creation: true,
      message: 'Please create your therapeutic profile through the proper interface',
      blocked_auto_creation: true
    };
  }

  // Update user metrics
  async updateUserMetrics(userUUID, metricsUpdate) {
    try {
      const userRef = doc(this.db, 'users', userUUID);
      await updateDoc(userRef, {
        [`metrics.${Object.keys(metricsUpdate)[0]}`]: Object.values(metricsUpdate)[0],
        last_active: serverTimestamp()
      });
      
      console.log(`✅ User metrics updated for: ${userUUID}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to update user metrics:', error);
      return { success: false, error: error.message };
    }
  }
}

// React hooks for using BrowserMemoryHooks in components
import { useState, useEffect, useCallback, useMemo } from 'react';

// Global instance for browser memory management
let globalMemoryManager = null;

// Get or create global memory manager instance
export function getBrowserMemoryManager() {
  if (!globalMemoryManager) {
    globalMemoryManager = new BrowserMemoryHooks();
  }
  return globalMemoryManager;
}

// Hook for conversation memory management
export function useConversationMemory(userUUID) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const memoryManager = useMemo(() => getBrowserMemoryManager(), []);

  const loadConversations = useCallback(async () => {
    if (!userUUID) return;
    
    try {
      setLoading(true);
      const result = await memoryManager.getConversationHistory(userUUID);
      
      if (result.requires_profile_creation) {
        setConversations([]);
        setError('Profile required');
      } else {
        setConversations(result.conversations || []);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userUUID, memoryManager]);

  const storeConversation = useCallback(async (conversationData) => {
    if (!userUUID) return { success: false, error: 'No user UUID' };
    
    try {
      const result = await memoryManager.storeConversation(userUUID, conversationData);
      
      if (result.success) {
        // Reload conversations to get updated list
        await loadConversations();
      }
      
      return result;
    } catch (err) {
      console.error('Failed to store conversation:', err);
      return { success: false, error: err.message };
    }
  }, [userUUID, memoryManager, loadConversations]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    loading,
    error,
    storeConversation,
    reloadConversations: loadConversations
  };
}

// Hook for stage memory management
export function useStageMemory(userUUID) {
  const [currentStage, setCurrentStage] = useState(null);
  const [stageProgress, setStageProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const memoryManager = useMemo(() => getBrowserMemoryManager(), []);

  const loadStageData = useCallback(async () => {
    if (!userUUID) return;
    
    try {
      setLoading(true);
      const current = await memoryManager.getCurrentStage(userUUID);
      setCurrentStage(current);
      setError(null);
    } catch (err) {
      console.error('Failed to load stage data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userUUID, memoryManager]);

  const updateStageProgression = useCallback(async (stageName, progressData) => {
    if (!userUUID) return { success: false, error: 'No user UUID' };
    
    try {
      const result = await memoryManager.updateStageProgression(userUUID, stageName, progressData);
      
      if (result.success) {
        await loadStageData(); // Reload to get updated stage
      }
      
      return result;
    } catch (err) {
      console.error('Failed to update stage progression:', err);
      return { success: false, error: err.message };
    }
  }, [userUUID, memoryManager, loadStageData]);

  const completeStage = useCallback(async (stageName) => {
    if (!userUUID) return { success: false, error: 'No user UUID' };
    
    try {
      const result = await memoryManager.completeStage(userUUID, stageName);
      
      if (result.success) {
        await loadStageData(); // Reload to get updated stage
      }
      
      return result;
    } catch (err) {
      console.error('Failed to complete stage:', err);
      return { success: false, error: err.message };
    }
  }, [userUUID, memoryManager, loadStageData]);

  useEffect(() => {
    loadStageData();
  }, [loadStageData]);

  return {
    currentStage,
    stageProgress,
    loading,
    error,
    updateStageProgression,
    completeStage,
    reloadStageData: loadStageData
  };
}

// Hook for user profile management
export function useUserProfile(userUUID) {
  const [profile, setProfile] = useState(null);
  const [setupStatus, setSetupStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const memoryManager = useMemo(() => getBrowserMemoryManager(), []);

  const loadProfile = useCallback(async () => {
    if (!userUUID) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Use getUserProfile method instead of getUserSetupStatus
      const profileResult = await memoryManager.getUserProfile(userUUID);
      
      if (profileResult.success && profileResult.exists) {
        setProfile(profileResult.profile);
        setSetupStatus({
          profile_exists: true,
          setup_completed: profileResult.setup_completed,
          current_stage: profileResult.profile.current_stage,
          requires_profile_creation: false,
          requires_setup_completion: !profileResult.setup_completed,
          user_data: profileResult.profile
        });
      } else {
        // No profile exists
        setProfile(null);
        setSetupStatus({
          profile_exists: false,
          setup_completed: false,
          current_stage: null,
          requires_profile_creation: true,
          requires_setup_completion: false,
          user_data: null
        });
      }
      
      setError(null);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError(err.message);
      // Set default "no profile" state on error
      setProfile(null);
      setSetupStatus({
        profile_exists: false,
        setup_completed: false,
        current_stage: null,
        requires_profile_creation: true,
        requires_setup_completion: false,
        user_data: null
      });
    } finally {
      setLoading(false);
    }
  }, [userUUID, memoryManager]);

  const createProfile = useCallback(async (profileData) => {
    if (!userUUID) return { success: false, error: 'No user UUID' };
    
    try {
      const result = await memoryManager.createNewUser(userUUID, profileData);
      
      if (result.success) {
        await loadProfile(); // Reload to get new profile
      }
      
      return result;
    } catch (err) {
      console.error('Failed to create profile:', err);
      return { success: false, error: err.message };
    }
  }, [userUUID, memoryManager, loadProfile]);

  const updateProfile = useCallback(async (updates) => {
    if (!userUUID) return { success: false, error: 'No user UUID' };
    
    try {
      const userRef = doc(memoryManager.db, 'users', userUUID);
      await updateDoc(userRef, {
        ...updates,
        last_active: serverTimestamp()
      });
      
      await loadProfile(); // Reload to get updated profile
      return { success: true };
    } catch (err) {
      console.error('Failed to update profile:', err);
      return { success: false, error: err.message };
    }
  }, [userUUID, memoryManager, loadProfile]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return {
    profile,
    setupStatus,
    loading,
    error,
    createProfile,
    updateProfile,
    reloadProfile: loadProfile,
    requiresProfile: setupStatus?.requires_profile_creation || false,
    requiresSetup: setupStatus?.requires_setup_completion || false,
    profileExists: setupStatus?.profile_exists || false
  };
}

// Hook for conversation context management
export function useConversationContext(userUUID) {
  const [context, setContext] = useState({
    currentStage: null,
    sessionActive: false,
    lastMessage: null,
    messageCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const memoryManager = useMemo(() => getBrowserMemoryManager(), []);

  const loadContext = useCallback(async () => {
    if (!userUUID) return;
    
    try {
      setLoading(true);
      const [currentStage, conversations] = await Promise.all([
        memoryManager.getCurrentStage(userUUID),
        memoryManager.getConversationHistory(userUUID, 1)
      ]);
      
      setContext({
        currentStage,
        sessionActive: currentStage?.started && !currentStage?.completed,
        lastMessage: conversations.conversations?.[0] || null,
        messageCount: conversations.conversations?.length || 0
      });
      setError(null);
    } catch (err) {
      console.error('Failed to load context:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userUUID, memoryManager]);

  const updateContext = useCallback(async () => {
    await loadContext();
  }, [loadContext]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  return {
    context,
    loading,
    error,
    updateContext,
    reloadContext: loadContext
  };
}

export default BrowserMemoryHooks;
