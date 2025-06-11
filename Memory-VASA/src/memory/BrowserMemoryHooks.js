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

  // FIXED: storeConversation method
  async storeConversation(userUUID, conversationData) {
    try {
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

  // Create new user with CSS structure
  async createNewUser(userUUID) {
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
          therapeutic_goals: [],
          preferences: {
            session_length: 'standard',
            intensity: 'moderate',
            communication_style: 'conversational'
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

  // Retrieve conversation history
  async getConversationHistory(userUUID, limit = 20) {
    try {
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
      
      return conversations.reverse(); // Return in chronological order
    } catch (error) {
      console.error('❌ Failed to get conversation history:', error);
      
      // Fallback to localStorage
      const storageKey = `memory_vasa_${userUUID}`;
      const localData = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return localData.slice(-limit);
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

export default BrowserMemoryHooks;
