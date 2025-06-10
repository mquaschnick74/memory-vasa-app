import { useState, useEffect, useCallback } from 'react';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import app from '../firebase-config.js';

// Updated Browser Memory Manager for Core Symbol Set Structure
class BrowserMemoryManager {
  constructor() {
    this.db = getFirestore(app);
    this.localCache = new Map();
    this.maxCacheSize = 100;
    console.log('BrowserMemoryManager initialized with Core Symbol Set structure');
  }

  // ===== USER PROFILE MANAGEMENT =====
  
  async getUserProfile(userUUID) {
    try {
      const userRef = doc(this.db, 'users', userUUID);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        console.log('✅ User profile retrieved:', userData);
        return userData;
      } else {
        console.log('❌ No user profile found, creating new user...');
        return await this.createNewUser(userUUID);
      }
    } catch (error) {
      console.error('❌ Error retrieving user profile:', error);
      return this.fallbackGetFromLocalStorage(`${userUUID}_profile`) || null;
    }
  }

  async createNewUser(userUUID, email = null, displayName = null) {
    try {
      const userData = {
        email: email || `${userUUID}@temp.com`,
        display_name: displayName || 'New User',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        is_active: true,
        emailVerified: false,
        preferences: {},
        current_stage: 1,
        overall_progress: 0,
        fragmentation_pattern: 'to_be_assessed'
      };

      await setDoc(doc(this.db, 'users', userUUID), userData);
      
      // Create initial stage progressions
      await this.initializeStageProgressions(userUUID);
      
      // Create initial user context
      await this.createInitialUserContext(userUUID);
      
      console.log('✅ New user created with Core Symbol Set structure');
      return userData;
    } catch (error) {
      console.error('❌ Error creating new user:', error);
      throw error;
    }
  }

  async storeUserProfile(userUUID, profileData) {
    try {
      const userRef = doc(this.db, 'users', userUUID);
      const profileEntry = {
        ...profileData,
        updated_at: serverTimestamp()
      };

      await setDoc(userRef, profileEntry, { merge: true });
      console.log('✅ Profile stored in Firebase:', profileEntry);
      return { success: true, data: profileEntry };
    } catch (error) {
      console.error('❌ Failed to store profile in Firebase:', error);
      this.fallbackToLocalStorage(`${userUUID}_profile`, profileData);
      throw error;
    }
  }

  // ===== STAGE PROGRESSION MANAGEMENT =====

  async initializeStageProgressions(userUUID) {
    const stages = [
      {
        id: 'stage_1_pointed_origin',
        stage_symbol: 'Ⓞ',
        stage_name: 'pointed_origin',
        stage_level: 1,
        active: true
      },
      {
        id: 'stage_2_focus_bind',
        stage_symbol: '•',
        stage_name: 'focus_bind',
        stage_level: 2,
        active: false
      },
      {
        id: 'stage_3_suspension',
        stage_symbol: '_',
        stage_name: 'suspension',
        stage_level: 3,
        active: false
      },
      {
        id: 'stage_4_gesture_toward',
        stage_symbol: '1',
        stage_name: 'gesture_toward',
        stage_level: 4,
        active: false
      },
      {
        id: 'stage_5_completion',
        stage_symbol: '2',
        stage_name: 'completion',
        stage_level: 5,
        active: false
      },
      {
        id: 'stage_6_terminal_symbol',
        stage_symbol: 'Ø',
        stage_name: 'terminal_symbol',
        stage_level: 6,
        active: false
      }
    ];

    for (const stage of stages) {
      const stageData = {
        session_id: stage.id,
        stage_symbol: stage.stage_symbol,
        stage_name: stage.stage_name,
        stage_level: stage.stage_level,
        progress_percentage: 0,
        completed: false,
        started_at: stage.active ? serverTimestamp() : null,
        completed_at: null,
        current_objectives: this.getStageObjectives(stage.stage_name),
        completion_markers: this.getCompletionMarkers(stage.stage_name),
        integration_data: stage.active ? this.getInitialIntegrationData(stage.stage_name) : {}
      };

      await setDoc(
        doc(this.db, 'users', userUUID, 'stage_progressions', stage.id),
        stageData
      );
    }
  }

  async getCurrentStage(userUUID) {
    try {
      const stageProgressionsRef = collection(this.db, 'users', userUUID, 'stage_progressions');
      const q = query(
        stageProgressionsRef,
        where('completed', '==', false),
        orderBy('stage_level', 'asc'),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const stageDoc = querySnapshot.docs[0];
        return {
          id: stageDoc.id,
          ...stageDoc.data()
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting current stage:', error);
      throw error;
    }
  }

  async getAllStageProgressions(userUUID) {
    try {
      const stageProgressionsRef = collection(this.db, 'users', userUUID, 'stage_progressions');
      const q = query(stageProgressionsRef, orderBy('stage_level', 'asc'));
      
      const querySnapshot = await getDocs(q);
      const stages = [];
      
      querySnapshot.forEach((doc) => {
        stages.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return stages;
    } catch (error) {
      console.error('❌ Error getting stage progressions:', error);
      return [];
    }
  }

  async storeStageProgression(userUUID, stageData) {
    try {
      // Store as update to existing stage progression
      const currentStage = await this.getCurrentStage(userUUID);
      if (currentStage) {
        const stageRef = doc(this.db, 'users', userUUID, 'stage_progressions', currentStage.id);
        await updateDoc(stageRef, {
          ...stageData,
          updated_at: serverTimestamp()
        });
        console.log(`✅ Stage progression updated: ${currentStage.id}`);
        return { success: true, id: currentStage.id };
      }
    } catch (error) {
      console.error('❌ Failed to store stage progression:', error);
      this.fallbackToLocalStorage(`${userUUID}_stages`, stageData);
      return { success: false, error: error.message };
    }
  }

  async updateStageProgress(userUUID, stageId, progressData) {
    try {
      const stageRef = doc(this.db, 'users', userUUID, 'stage_progressions', stageId);
      await updateDoc(stageRef, {
        ...progressData,
        updated_at: serverTimestamp()
      });
      console.log(`✅ Stage ${stageId} progress updated`);
    } catch (error) {
      console.error('❌ Error updating stage progress:', error);
      throw error;
    }
  }

  async completeStage(userUUID, stageId) {
    try {
      const stageRef = doc(this.db, 'users', userUUID, 'stage_progressions', stageId);
      await updateDoc(stageRef, {
        completed: true,
        completed_at: serverTimestamp(),
        progress_percentage: 100
      });

      // Activate next stage
      const currentStage = await getDoc(stageRef);
      const currentStageData = currentStage.data();
      const nextStageLevel = currentStageData.stage_level + 1;

      if (nextStageLevel <= 6) {
        const nextStageId = `stage_${nextStageLevel}_${this.getStageNameByLevel(nextStageLevel)}`;
        const nextStageRef = doc(this.db, 'users', userUUID, 'stage_progressions', nextStageId);
        await updateDoc(nextStageRef, {
          started_at: serverTimestamp()
        });

        // Update user's current stage
        await this.storeUserProfile(userUUID, {
          current_stage: nextStageLevel,
          overall_progress: Math.round((nextStageLevel - 1) / 6 * 100)
        });
      }

      console.log(`✅ Stage ${stageId} completed, next stage activated`);
    } catch (error) {
      console.error('❌ Error completing stage:', error);
      throw error;
    }
  }

  // ===== CONVERSATION MANAGEMENT (USER_CONTEXT) =====

  async getConversationHistory(userUUID, limitCount = 50) {
    try {
      // Check local cache first
      const cached = this.getFromLocalCache(userUUID);
      if (cached && cached.length > 0) {
        return cached.slice(-limitCount);
      }

      const userContextRef = collection(this.db, 'users', userUUID, 'user_context');
      const q = query(
        userContextRef,
        where('context_type', '==', 'therapeutic_session'),
        orderBy('created_at', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const conversations = [];
      
      querySnapshot.forEach((doc) => {
        const contextData = doc.data();
        // Extract individual messages from conversation_thread
        if (contextData.conversation_thread) {
          contextData.conversation_thread.forEach((message) => {
            conversations.push({
              id: doc.id,
              content: message.message,
              type: message.sender,
              stage: contextData.current_stage || 'pointed_origin',
              timestamp: message.timestamp?.toDate?.() || new Date(message.timestamp),
              message_type: message.message_type || 'text',
              userUUID: userUUID
            });
          });
        }
      });
      
      // Sort by timestamp (newest first)
      conversations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const sortedHistory = conversations.reverse(); // Return in chronological order
      
      // Cache the results
      this.localCache.set(userUUID, sortedHistory);
      
      console.log(`✅ Retrieved ${conversations.length} conversation messages from user_context`);
      return sortedHistory;
    } catch (error) {
      console.error('❌ Failed to retrieve conversation history:', error);
      return this.fallbackGetFromLocalStorage(userUUID) || [];
    }
  }

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
            timestamp: serverTimestamp(),
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
          timestamp: serverTimestamp(),
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
  }

  async getConversationContext(userUUID, limitCount = 10) {
    try {
      const history = await this.getConversationHistory(userUUID, limitCount);

      if (!history || history.length === 0) {
        return null;
      }

      const contextEntries = history.map(entry => ({
        role: entry.type === 'user' ? 'user' : 'assistant',
        content: entry.content || entry.message || '',
        timestamp: entry.timestamp,
        stage: entry.stage || entry.css_stage
      }));

      return {
        summary: this.generateContextSummary(contextEntries),
        entries: contextEntries,
        lastSession: history[history.length - 1]?.timestamp
      };
    } catch (error) {
      console.error('❌ Failed to get conversation context:', error);
      return null;
    }
  }

  generateContextSummary(entries) {
    if (!entries || entries.length === 0) return '';

    const userMessages = entries.filter(e => e.role === 'user').length;
    const assistantMessages = entries.filter(e => e.role === 'assistant').length;
    const stages = [...new Set(entries.filter(e => e.stage).map(e => e.stage))];

    let summary = `Previous conversation had ${userMessages} user messages and ${assistantMessages} VASA responses.`;

    if (stages.length > 0) {
      summary += ` CSS stages covered: ${stages.join(', ')}.`;
    }

    return summary;
  }

  // ===== ASSESSMENT METHODS =====

  async updateFragmentationPattern(userUUID, pattern, assessmentData = {}) {
    try {
      // Update user profile
      await this.storeUserProfile(userUUID, {
        fragmentation_pattern: pattern
      });

      // Update Stage 1 integration data with pattern-specific information
      const stage1Ref = doc(this.db, 'users', userUUID, 'stage_progressions', 'stage_1_pointed_origin');
      const patternSpecificData = this.getPatternSpecificIntegrationData(pattern, assessmentData);
      
      await updateDoc(stage1Ref, {
        integration_data: patternSpecificData
      });

      console.log(`✅ Fragmentation pattern updated to: ${pattern}`);
    } catch (error) {
      console.error('❌ Error updating fragmentation pattern:', error);
      throw error;
    }
  }

  // ===== HELPER METHODS =====

  getStageObjectives(stageName) {
    const objectives = {
      'pointed_origin': [
        'Identify specific patterns of perceptual fragmentation',
        'Help user become conscious of these patterns',
        'Recognize the symbolic call',
        'Establish therapeutic container'
      ],
      'focus_bind': [
        'Introduce contradictions that challenge fragmented framework',
        'Support sustained attention to contradictory elements',
        'Develop capacity for containment of psychological tensions',
        'Establish binding quality for simultaneous contradictions'
      ],
      'suspension': [
        'Support user through periods of ambiguity and uncertainty',
        'Help manage anxiety accompanying destabilization',
        'Cultivate comfort with liminal pause between contradiction and integration',
        'Prevent premature closure or resolution of contradictions'
      ],
      'gesture_toward': [
        'Support maintaining awareness of contradictions while allowing integration',
        'Recognize and encourage first releases or shifts toward resolution',
        'Facilitate transition from conscious effort to spontaneous integration',
        'Cultivate capacity for thending as active process'
      ],
      'completion': [
        'Help user recognize and stabilize new orientation from integration',
        'Support practices for maintaining both constancy and variability',
        'Establish symbolic closure while preserving adaptability',
        'Consolidate capacity for CYVC across contexts and challenges'
      ],
      'terminal_symbol': [
        'Recognize when recursion or revisiting earlier stages is necessary',
        'Develop user\'s capacity for meta-reflection on integration process',
        'Identify completion of one cycle and potential beginning of another',
        'Establish foundation for ongoing self-guided integration'
      ]
    };
    return objectives[stageName] || [];
  }

  getCompletionMarkers(stageName) {
    const markers = {
      'pointed_origin': [
        'Clear fragmentation pattern identified and named',
        'User demonstrates awareness of this pattern',
        'Therapeutic container has been established',
        'Symbolic call has been articulated and acknowledged'
      ],
      'focus_bind': [
        'Key contradiction pairs identified and introduced',
        'User demonstrates capacity to sustain attention to contradictions',
        'Potential binding qualities have been identified',
        'Increased tolerance for psychological tension'
      ],
      'suspension': [
        'Increased tolerance for ambiguity demonstrated',
        'Anxiety associated with liminality decreased to manageable levels',
        'Drive toward premature resolution has diminished',
        'Quality of fertile waiting has been established'
      ],
      'gesture_toward': [
        'Integrative moments occur with increasing frequency',
        'Transition from effort to spontaneity is well-established',
        'User demonstrates capacity for active thending',
        'Initial sense of unified perception has emerged'
      ],
      'completion': [
        'Integrated perception demonstrates stability across contexts',
        'Optimal balance between constancy and variability established',
        'Sense of symbolic closure has been achieved',
        'Capacity for CYVC has been consolidated'
      ],
      'terminal_symbol': [
        'Integration cycle demonstrates substantial completion',
        'User shows capacity for identifying and managing recursion needs',
        'Meta-reflective awareness of integration process well-established',
        'Foundation for ongoing self-guided integration created'
      ]
    };
    return markers[stageName] || [];
  }

  getInitialIntegrationData(stageName) {
    if (stageName === 'pointed_origin') {
      return {
        primary_fragmentation_pattern: 'to_be_assessed',
        dominant_register_imbalance: 'to_be_assessed',
        symbolic_call: 'to_be_determined',
        containment_resources: ['breathing_exercises', 'grounding_protocol'],
        fragmentation_mapping: {
          sensory_disconnections: 'assessment_needed',
          symbolic_disruptions: 'assessment_needed',
          meaning_making_patterns: 'assessment_needed'
        }
      };
    }
    return {};
  }

  getStageFocus(stageName, messageType) {
    const focuses = {
      'pointed_origin': messageType === 'user' ? 'fragmentation_exploration' : 'fragmentation_identification',
      'focus_bind': messageType === 'user' ? 'contradiction_awareness' : 'contradiction_introduction',
      'suspension': messageType === 'user' ? 'liminal_experience' : 'liminal_support',
      'gesture_toward': messageType === 'user' ? 'integration_exploration' : 'integration_facilitation',
      'completion': messageType === 'user' ? 'stability_development' : 'consolidation_support',
      'terminal_symbol': messageType === 'user' ? 'meta_reflection' : 'process_review'
    };
    return focuses[stageName] || 'general_therapeutic';
  }

  getStageNameByLevel(level) {
    const stageNames = {
      1: 'pointed_origin',
      2: 'focus_bind', 
      3: 'suspension',
      4: 'gesture_toward',
      5: 'completion',
      6: 'terminal_symbol'
    };
    return stageNames[level] || 'pointed_origin';
  }

  getPatternSpecificIntegrationData(pattern, assessmentData) {
    const patterns = {
      'psychotic': {
        primary_fragmentation_pattern: 'psychotic',
        dominant_register_imbalance: 'real_over_symbolic_imaginary',
        symbolic_call: 'coherent_reality_testing_and_symbolic_integration',
        containment_resources: ['reality_grounding_protocol', 'structured_environment', 'crisis_intervention_plan'],
        fragmentation_mapping: {
          sensory_disconnections: 'perceptual_distortions_and_reality_testing_difficulties',
          symbolic_disruptions: 'severe_meaning_making_disruption',
          meaning_making_patterns: 'loose_associations_and_concrete_thinking'
        }
      },
      'obsessive_neurotic': {
        primary_fragmentation_pattern: 'obsessive_neurotic',
        dominant_register_imbalance: 'imaginary_over_symbolic_real',
        symbolic_call: 'authentic_connection_between_thought_and_experience',
        containment_resources: ['grounding_protocol', 'breathing_exercises', 'present_moment_anchoring'],
        fragmentation_mapping: {
          sensory_disconnections: 'difficulty_feeling_emotions_in_body',
          symbolic_disruptions: 'rigid_meaning_structures_and_overthinking',
          meaning_making_patterns: 'excessive_planning_rumination_and_mental_elaboration'
        }
      },
      'hysteric_neurotic': {
        primary_fragmentation_pattern: 'hysteric_neurotic',
        dominant_register_imbalance: 'real_over_symbolic_imaginary',
        symbolic_call: 'emotional_regulation_and_meaning_making_capacity',
        containment_resources: ['emotional_regulation_techniques', 'symbolic_structuring_exercises', 'narrative_coherence_work'],
        fragmentation_mapping: {
          sensory_disconnections: 'emotional_flooding_and_overwhelming_sensations',
          symbolic_disruptions: 'difficulty_creating_coherent_meaning_from_experience',
          meaning_making_patterns: 'fragmented_narratives_and_symbolic_confusion'
        }
      }
    };

    return {
      ...patterns[pattern] || patterns['obsessive_neurotic'],
      ...assessmentData
    };
  }

  // ===== LOCAL CACHE AND FALLBACK METHODS =====

  addToLocalCache(key, data) {
    if (this.localCache.size >= this.maxCacheSize) {
      const firstKey = this.localCache.keys().next().value;
      this.localCache.delete(firstKey);
    }

    const existing = this.localCache.get(key) || [];
    existing.push(data);
    this.localCache.set(key, existing);
  }

  getFromLocalCache(key) {
    return this.localCache.get(key) || [];
  }

  fallbackToLocalStorage(key, data) {
    try {
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(data);
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (error) {
      console.error('LocalStorage fallback failed:', error);
    }
  }

  fallbackGetFromLocalStorage(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (error) {
      console.error('LocalStorage retrieval failed:', error);
      return [];
    }
  }
}

// Create singleton instance
const browserMemoryManager = new BrowserMemoryManager();

// ===== UPDATED REACT HOOKS FOR CORE SYMBOL SET =====

export const useConversationMemory = (userUUID) => {
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadHistory = useCallback(async () => {
    if (!userUUID) return;

    setIsLoading(true);
    setError(null);

    try {
      const history = await browserMemoryManager.getConversationHistory(userUUID);
      setConversationHistory(history);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userUUID]);

  const addConversation = useCallback(async (conversationData) => {
    if (!userUUID) {
      console.warn('No userUUID available for conversation storage');
      return;
    }

    try {
      const stored = await browserMemoryManager.storeConversation(userUUID, conversationData);
      if (stored && stored.success) {
        setConversationHistory(prev => [...prev, {
          userUUID,
          timestamp: new Date().toISOString(),
          ...conversationData
        }]);
      }
    } catch (err) {
      console.error('Failed to add conversation:', err);
      setError(err.message);
    }
  }, [userUUID]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    conversationHistory,
    isLoading,
    error,
    addConversation,
    refreshHistory: loadHistory
  };
};

export const useStageMemory = (userUUID) => {
  const [stageHistory, setStageHistory] = useState([]);
  const [currentStage, setCurrentStage] = useState(null);
  const [allStages, setAllStages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadCurrentStage = useCallback(async () => {
    if (!userUUID) return;

    try {
      const stage = await browserMemoryManager.getCurrentStage(userUUID);
      setCurrentStage(stage);
    } catch (err) {
      setError(err.message);
    }
  }, [userUUID]);

  const loadAllStages = useCallback(async () => {
    if (!userUUID) return;

    try {
      const stages = await browserMemoryManager.getAllStageProgressions(userUUID);
      setAllStages(stages);
    } catch (err) {
      setError(err.message);
    }
  }, [userUUID]);

  const recordStageTransition = useCallback(async (stageData) => {
    if (!userUUID) return;

    try {
      await browserMemoryManager.storeStageProgression(userUUID, stageData);
      setStageHistory(prev => [...prev, {
        userUUID,
        timestamp: new Date().toISOString(),
        ...stageData
      }]);
      // Refresh current stage
      await loadCurrentStage();
    } catch (err) {
      setError(err.message);
    }
  }, [userUUID, loadCurrentStage]);

  const updateStageProgress = useCallback(async (stageId, progressData) => {
    if (!userUUID) return;

    try {
      await browserMemoryManager.updateStageProgress(userUUID, stageId, progressData);
      await loadCurrentStage();
      await loadAllStages();
    } catch (err) {
      setError(err.message);
    }
  }, [userUUID, loadCurrentStage, loadAllStages]);

  const completeStage = useCallback(async (stageId) => {
    if (!userUUID) return;

    try {
      await browserMemoryManager.completeStage(userUUID, stageId);
      await loadCurrentStage();
      await loadAllStages();
    } catch (err) {
      setError(err.message);
    }
  }, [userUUID, loadCurrentStage, loadAllStages]);

  useEffect(() => {
    if (userUUID) {
      loadCurrentStage();
      loadAllStages();
    }
  }, [userUUID, loadCurrentStage, loadAllStages]);

  return {
    stageHistory,
    currentStage,
    allStages,
    isLoading,
    error,
    recordStageTransition,
    updateStageProgress,
    completeStage,
    refreshStages: () => {
      loadCurrentStage();
      loadAllStages();
    }
  };
};

export const useUserProfile = (userUUID) => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async () => {
    if (!userUUID) return;

    setIsLoading(true);
    setError(null);

    try {
      const userProfile = await browserMemoryManager.getUserProfile(userUUID);
      setProfile(userProfile);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userUUID]);

  const updateProfile = useCallback(async (profileData) => {
    if (!userUUID) {
      console.warn('No userUUID available for profile update');
      return null;
    }

    try {
      setIsLoading(true);
      const result = await browserMemoryManager.storeUserProfile(userUUID, profileData);
      setProfile({ ...profileData, userUUID });
      setError(null);
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Failed to update profile:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [userUUID]);

  const updateFragmentationPattern = useCallback(async (pattern, assessmentData = {}) => {
    if (!userUUID) return;

    try {
      await browserMemoryManager.updateFragmentationPattern(userUUID, pattern, assessmentData);
      await loadProfile(); // Refresh profile after update
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [userUUID, loadProfile]);

  useEffect(() => {
    if (!userUUID) {
      setProfile(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    loadProfile();
  }, [userUUID, loadProfile]);

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    updateFragmentationPattern,
    refreshProfile: loadProfile
  };
};

export const useConversationContext = (userUUID) => {
  const [context, setContext] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const getContext = useCallback(async () => {
    if (!userUUID) return null;

    setIsLoading(true);
    try {
      const contextData = await browserMemoryManager.getConversationContext(userUUID);
      setContext(contextData);
      return contextData;
    } catch (error) {
      console.error('Failed to get conversation context:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userUUID]);

  return {
    context,
    getContext,
    isLoading
  };
};

export const getBrowserMemoryManager = () => browserMemoryManager;
