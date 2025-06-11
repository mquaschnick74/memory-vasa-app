import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc,
  addDoc,
  getDoc,
  getDocs, // ✅ Added missing import
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import app from '../firebase-config.js';

class WebhookHandler {
  constructor(memoryManager) {
    this.memoryManager = memoryManager;
    this.webhookEndpoint = '/api/elevenlabs-webhook';
    this.db = getFirestore(app);
    
    console.log('WebhookHandler initialized with Core Symbol Set Firebase structure');
  }

  // Process incoming ElevenLabs webhook
  async processWebhook(webhookData) {
    try {
      const { agent_id, conversation_id, user_id, message, message_type, timestamp } = webhookData;

      // Extract user UUID from the webhook data or session
      const userUUID = user_id || this.extractUserFromConversation(conversation_id);

      if (!userUUID) {
        console.warn('No user UUID found in webhook data');
        return { success: false, error: 'Missing user identification' };
      }

      // Ensure user exists with CSS structure
      await this.ensureUserCSSStructure(userUUID);

      // Process different message types
      switch (message_type) {
        case 'agent_response':
          await this.handleAgentResponse(userUUID, {
            message,
            agent_id,
            conversation_id,
            timestamp: timestamp || new Date().toISOString()
          });
          break;

        case 'user_message':
          await this.handleUserMessage(userUUID, {
            message,
            conversation_id,
            timestamp: timestamp || new Date().toISOString()
          });
          break;

        case 'conversation_start':
          await this.handleConversationStart(userUUID, {
            conversation_id,
            agent_id,
            timestamp: timestamp || new Date().toISOString()
          });
          break;

        case 'conversation_end':
          await this.handleConversationEnd(userUUID, {
            conversation_id,
            timestamp: timestamp || new Date().toISOString()
          });
          break;

        default:
          console.log('Unknown webhook message type:', message_type);
      }

      return { success: true };
    } catch (error) {
      console.error('Webhook processing error:', error);
      return { success: false, error: error.message };
    }
  }

  // Ensure user has proper CSS structure
  async ensureUserCSSStructure(userUUID) {
    try {
      const userRef = doc(this.db, 'users', userUUID);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        // Create user with CSS structure
        await this.memoryManager.createNewUser(userUUID);
        console.log(`✅ Created CSS structure for user: ${userUUID}`);
      }
    } catch (error) {
      console.error('❌ Error ensuring CSS structure:', error);
    }
  }

  // Handle agent responses - FIXED to use CSS subcollections
  async handleAgentResponse(userUUID, responseData) {
    const sessionId = responseData.conversation_id;
    
    // Store in user_context subcollection (CSS structure)
    await this.storeUserContext(userUUID, {
      message: responseData.message,
      sender: 'assistant',
      agent_id: responseData.agent_id,
      conversation_id: responseData.conversation_id,
      timestamp: responseData.timestamp,
      message_type: 'text',
      stage_focus: 'webhook_response'
    });

    // Detect CSS stage from agent response
    const detectedStage = this.detectStageFromResponse(responseData.message);
    if (detectedStage) {
      // Update current stage progression
      await this.updateStageProgression(userUUID, detectedStage, {
        trigger: 'agent_response',
        context: responseData.message.substring(0, 100),
        conversation_id: responseData.conversation_id
      });
    }

    // Detect breakthrough moments and therapeutic themes
    const breakthrough = this.detectBreakthroughMoment(responseData.message);
    const themes = this.detectTherapeuticThemes(responseData.message);
    
    // Store insights in user_context with special tags
    if (breakthrough || themes.length > 0) {
      await this.storeTherapeuticInsights(userUUID, {
        breakthrough,
        themes,
        source_message: responseData.message,
        conversation_id: responseData.conversation_id,
        timestamp: responseData.timestamp
      });
    }
  }

  // Handle user messages - FIXED to use CSS subcollections
  async handleUserMessage(userUUID, messageData) {
    await this.storeUserContext(userUUID, {
      message: messageData.message,
      sender: 'user',
      conversation_id: messageData.conversation_id,
      timestamp: messageData.timestamp,
      message_type: 'text',
      stage_focus: 'user_expression'
    });

    // Detect user insights and breakthrough moments
    const breakthrough = this.detectBreakthroughMoment(messageData.message);
    const themes = this.detectTherapeuticThemes(messageData.message);
    
    if (breakthrough || themes.length > 0) {
      await this.storeTherapeuticInsights(userUUID, {
        breakthrough,
        themes,
        source_message: messageData.message,
        conversation_id: messageData.conversation_id,
        timestamp: messageData.timestamp
      });
    }
  }

  // Handle conversation start - FIXED to use CSS subcollections
  async handleConversationStart(userUUID, startData) {
    await this.storeUserContext(userUUID, {
      message: 'Conversation started with Memory VASA',
      sender: 'system',
      agent_id: startData.agent_id,
      conversation_id: startData.conversation_id,
      timestamp: startData.timestamp,
      message_type: 'system',
      stage_focus: 'session_start'
    });
  }

  // Handle conversation end - FIXED to use CSS subcollections
  async handleConversationEnd(userUUID, endData) {
    await this.storeUserContext(userUUID, {
      message: 'Conversation ended',
      sender: 'system',
      conversation_id: endData.conversation_id,
      timestamp: endData.timestamp,
      message_type: 'system',
      stage_focus: 'session_end'
    });

    // Update user metrics for session completion
    try {
      await this.updateUserSessionMetrics(userUUID, endData.conversation_id);
    } catch (error) {
      console.error('❌ Failed to update session metrics:', error);
    }
  }

  // FIXED: Store in users/{userUUID}/stage_progressions/ subcollection
  async updateStageProgression(userUUID, detectedStage, progressData) {
    try {
      // Get current stage
      const currentStage = await this.getCurrentStage(userUUID);
      
      if (currentStage) {
        const stageRef = doc(this.db, 'users', userUUID, 'stage_progressions', currentStage.id);
        
        // Update current stage with webhook data
        await updateDoc(stageRef, {
          integration_data: {
            ...currentStage.integration_data,
            webhook_insights: progressData,
            detected_stage: detectedStage,
            last_webhook_update: serverTimestamp()
          },
          updated_at: serverTimestamp()
        });
        
        console.log(`✅ Stage progression updated via webhook for stage: ${currentStage.stage_name}`);
      }
    } catch (error) {
      console.error('❌ Failed to update stage progression via webhook:', error);
    }
  }

  // FIXED: Store in users/{userUUID}/user_context/ subcollection
  async storeUserContext(userUUID, contextData) {
    try {
      const contextId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const contextEntry = {
        context_id: contextId,
        context_type: 'therapeutic_session',
        current_stage: await this.getCurrentStageName(userUUID),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        conversation_thread: [
          {
            message: contextData.message,
            sender: contextData.sender,
            timestamp: new Date(contextData.timestamp), // ✅ Use new Date() instead of serverTimestamp()
            message_type: contextData.message_type || 'text',
            stage_focus: contextData.stage_focus || 'general'
          }
        ],
        tags: ['webhook', 'elevenlabs', contextData.stage_focus],
        priority: 3,
        integration_insights: [],
        metadata: {
          source: 'elevenlabs_webhook',
          agent_id: contextData.agent_id,
          conversation_id: contextData.conversation_id
        }
      };

      const contextRef = doc(this.db, 'users', userUUID, 'user_context', contextId);
      await setDoc(contextRef, contextEntry);
      
      console.log(`✅ User context stored in CSS structure via webhook: ${contextId}`);
      return { success: true, id: contextId };
    } catch (error) {
      console.error('❌ Failed to store user context via webhook:', error);
      throw error;
    }
  }

  // FIXED: Store insights in user_context with special tags
  async storeTherapeuticInsights(userUUID, insightData) {
    try {
      const contextId = `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const insightEntry = {
        context_id: contextId,
        context_type: 'therapeutic_insight',
        current_stage: await this.getCurrentStageName(userUUID),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        conversation_thread: [
          {
            message: `Therapeutic insight detected: ${insightData.breakthrough ? 'Breakthrough moment' : 'Thematic pattern'}`,
            sender: 'system',
            timestamp: new Date(insightData.timestamp), // ✅ Use new Date() for consistency
            message_type: 'insight',
            stage_focus: 'therapeutic_analysis'
          }
        ],
        tags: ['insight', 'therapeutic', 'webhook', 'analysis'],
        priority: 4, // High priority for insights
        integration_insights: [
          ...(insightData.breakthrough ? [`Breakthrough: ${insightData.breakthrough.description}`] : []),
          ...insightData.themes.map(theme => `Theme: ${theme.theme} - ${theme.evidence}`)
        ],
        therapeutic_data: {
          breakthrough: insightData.breakthrough,
          themes: insightData.themes,
          source_message: insightData.source_message,
          conversation_id: insightData.conversation_id
        }
      };

      const contextRef = doc(this.db, 'users', userUUID, 'user_context', contextId);
      await setDoc(contextRef, insightEntry);
      
      console.log(`✅ Therapeutic insights stored in CSS structure: ${contextId}`);
      return { success: true, id: contextId };
    } catch (error) {
      console.error('❌ Failed to store therapeutic insights:', error);
      throw error;
    }
  }

  // Update user session metrics
  async updateUserSessionMetrics(userUUID, conversationId) {
    try {
      const userRef = doc(this.db, 'users', userUUID);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const currentMetrics = userSnap.data().metrics || {};
        
        await updateDoc(userRef, {
          'metrics.total_sessions': (currentMetrics.total_sessions || 0) + 1,
          'metrics.last_session': serverTimestamp(),
          last_active: serverTimestamp()
        });
        
        console.log(`✅ Session metrics updated for user: ${userUUID}`);
      }
    } catch (error) {
      console.error('❌ Failed to update session metrics:', error);
    }
  }

  // Helper: Get current stage name
  async getCurrentStageName(userUUID) {
    try {
      const currentStage = await this.getCurrentStage(userUUID);
      return currentStage?.stage_name || 'pointed_origin';
    } catch (error) {
      return 'pointed_origin';
    }
  }

  // Helper: Get current stage (simplified query to avoid index issues)
  async getCurrentStage(userUUID) {
    try {
      // Get all stage progressions and find current one in memory
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
      console.error('❌ Error getting current stage in webhook:', error);
      return null;
    }
  }

  // FIXED: Detect CSS stage with correct symbols
  detectStageFromResponse(response) {
    if (!response || typeof response !== 'string') return null;

    // Stage detection based on VASA's response keywords with CORRECT CSS symbols
    if (/contradiction|CVDC|hold.*tension|suspend|between/i.test(response)) {
      return '_'; // Suspension - Navigating Liminality
    } else if (/integration|CYVC|completion|whole|unified|resolved/i.test(response)) {
      return '2'; // Completion - Cultivating CYVC
    } else if (/begin|fragment|reveal|origin|start|initial|fragmentation/i.test(response)) {
      return 'Ⓞ'; // Pointed Origin - Revealing Fragmentation (CORRECT symbol)
    } else if (/gesture|movement|toward|direction|shift|change|thend/i.test(response)) {
      return '1'; // Gesture Toward - Facilitating Thend
    } else if (/terminal|loop|end|cycle|closure|recursive|meta.*reflection/i.test(response)) {
      return 'Ø'; // Terminal Symbol - Meta-reflection (CORRECT symbol)
    } else if (/focus|bind|attention|concentrate|present/i.test(response)) {
      return '•'; // Focus/Bind - Introducing CVDC
    }

    return null;
  }

  // Extract user UUID from conversation ID (implement based on your ID strategy)
  extractUserFromConversation(conversationId) {
    // This would depend on how you structure your conversation IDs
    // You might encode the user UUID in the conversation ID or maintain a mapping
    // For now, return null and rely on explicit user_id in webhook
    return null;
  }

  // Setup webhook listener (for client-side webhook simulation)
  setupWebhookListener() {
    // This would typically be handled by your backend
    // But you can simulate webhook events for development
    if (typeof window !== 'undefined') {
      window.addEventListener('elevenlabs-webhook', (event) => {
        this.processWebhook(event.detail);
      });
      console.log('✅ Webhook listener setup complete');
    }
  }

  // Trigger webhook event (for testing/simulation)
  triggerWebhookEvent(webhookData) {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('elevenlabs-webhook', {
        detail: webhookData
      });
      window.dispatchEvent(event);
      console.log('✅ Webhook event triggered:', webhookData.message_type);
    }
  }

  // Detect breakthrough moments from conversation
  detectBreakthroughMoment(message) {
    const breakthroughIndicators = [
      /suddenly (understand|realize|see)/i,
      /that makes sense now/i,
      /i never thought of it that way/i,
      /revelation|epiphany|breakthrough/i,
      /everything clicked/i,
      /now i get it/i,
      /aha|eureka/i,
      /finally understand/i,
      /pieces coming together/i,
      /light bulb moment/i,
      /it all makes sense/i,
      /clarity|clear now/i
    ];

    for (const indicator of breakthroughIndicators) {
      if (indicator.test(message)) {
        return {
          type: 'insight',
          trigger: 'conversation',
          description: message.substring(0, 200),
          keywords: message.match(indicator)?.[0] || '',
          confidence: 0.8,
          timestamp: new Date().toISOString(),
          css_stage_relevance: this.getBreakthroughStageRelevance(message)
        };
      }
    }
    return null;
  }

  // Detect therapeutic themes
  detectTherapeuticThemes(message) {
    const themes = [];
    const themePatterns = {
      'contradiction': /contradiction|paradox|conflicting|opposing|tension/i,
      'completion': /completion|finished|whole|complete|resolved|integration/i,
      'fragmentation': /fragment|pieces|broken|scattered|disconnected|separate/i,
      'integration': /integration|bringing together|unifying|connecting|synthesis/i,
      'identity': /who am i|sense of self|identity|belonging|authentic/i,
      'relationship': /relationship|connection|family|friends|intimate/i,
      'trauma': /trauma|painful|hurt|wound|healing|recovery/i,
      'growth': /growth|development|progress|journey|transformation/i,
      'awareness': /awareness|conscious|mindful|present|attention/i,
      'emotional_regulation': /emotions|feelings|overwhelming|regulation|balance/i,
      'liminality': /in between|uncertain|liminal|threshold|transition/i,
      'focus': /focus|concentration|attention|present moment|mindful/i
    };

    for (const [theme, pattern] of Object.entries(themePatterns)) {
      if (pattern.test(message)) {
        themes.push({
          theme,
          evidence: message.substring(0, 150),
          confidence: 0.8, // Could be made more sophisticated
          timestamp: new Date().toISOString(),
          css_relevance: this.getThemeCSSRelevance(theme)
        });
      }
    }

    return themes;
  }

  // Map themes to CSS stages
  getThemeCSSRelevance(theme) {
    const themeToStage = {
      'fragmentation': 'pointed_origin',
      'focus': 'focus_bind',
      'contradiction': 'focus_bind',
      'liminality': 'suspension',
      'awareness': 'suspension',
      'integration': 'gesture_toward',
      'completion': 'completion',
      'growth': 'terminal_symbol',
      'identity': 'terminal_symbol'
    };
    
    return themeToStage[theme] || 'general';
  }

  // Get breakthrough stage relevance
  getBreakthroughStageRelevance(message) {
    // Analyze message content to determine which CSS stage this breakthrough relates to
    if (/fragment|pieces|pattern/i.test(message)) return 'pointed_origin';
    if (/focus|attention|concentrate/i.test(message)) return 'focus_bind';
    if (/tension|contradiction|between/i.test(message)) return 'suspension';
    if (/direction|movement|toward/i.test(message)) return 'gesture_toward';
    if (/integration|whole|complete/i.test(message)) return 'completion';
    if (/journey|growth|reflection/i.test(message)) return 'terminal_symbol';
    
    return 'general';
  }

  // Get webhook statistics for monitoring
  async getWebhookStats(userUUID) {
    try {
      const userContextRef = collection(this.db, 'users', userUUID, 'user_context');
      const querySnapshot = await getDocs(userContextRef);
      
      let webhookCount = 0;
      let insightCount = 0;
      let lastWebhookTime = null;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.metadata?.source === 'elevenlabs_webhook') {
          webhookCount++;
          if (data.context_type === 'therapeutic_insight') {
            insightCount++;
          }
          
          const createdAt = data.created_at?.toDate() || new Date(data.created_at);
          if (!lastWebhookTime || createdAt > lastWebhookTime) {
            lastWebhookTime = createdAt;
          }
        }
      });
      
      return {
        total_webhook_messages: webhookCount,
        therapeutic_insights: insightCount,
        last_webhook_activity: lastWebhookTime,
        webhook_active: lastWebhookTime && (new Date() - lastWebhookTime) < 24 * 60 * 60 * 1000 // Active within 24 hours
      };
    } catch (error) {
      console.error('❌ Failed to get webhook stats:', error);
      return {
        total_webhook_messages: 0,
        therapeutic_insights: 0,
        last_webhook_activity: null,
        webhook_active: false
      };
    }
  }
}

export default WebhookHa
