class WebhookHandler {
  constructor(memoryManager) {
    this.memoryManager = memoryManager;
    this.webhookEndpoint = '/api/elevenlabs-webhook';
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

  // Handle agent responses
  async handleAgentResponse(userUUID, responseData) {
    const sessionId = responseData.conversation_id;
    
    const conversationEntry = {
      type: 'assistant',
      content: responseData.message,
      agent_id: responseData.agent_id,
      conversation_id: responseData.conversation_id,
      sessionId: sessionId,
      timestamp: responseData.timestamp,
      metadata: {
        source: 'elevenlabs_webhook'
      }
    };

    // Detect CSS stage from agent response
    const detectedStage = this.detectStageFromResponse(responseData.message);
    if (detectedStage) {
      conversationEntry.css_stage = detectedStage;

      // Store stage progression in session-specific location
      await this.storeSessionStageProgression(userUUID, sessionId, {
        stage: detectedStage,
        trigger: 'agent_response',
        context: responseData.message.substring(0, 100),
        conversation_id: responseData.conversation_id
      });
    }

    // Detect breakthrough moments
    const breakthrough = this.detectBreakthroughMoment(responseData.message);
    if (breakthrough) {
      await this.storeBreakthroughMoment(userUUID, sessionId, breakthrough);
    }

    // Detect therapeutic themes
    const themes = this.detectTherapeuticThemes(responseData.message);
    if (themes.length > 0) {
      for (const theme of themes) {
        await this.storeTherapeuticTheme(userUUID, sessionId, theme);
      }
    }

    await this.memoryManager.storeConversation(userUUID, conversationEntry);
  }

  // Handle user messages
  async handleUserMessage(userUUID, messageData) {
    const conversationEntry = {
      type: 'user',
      content: messageData.message,
      conversation_id: messageData.conversation_id,
      timestamp: messageData.timestamp,
      metadata: {
        source: 'elevenlabs_webhook'
      }
    };

    await this.memoryManager.storeConversation(userUUID, conversationEntry);
  }

  // Handle conversation start
  async handleConversationStart(userUUID, startData) {
    const conversationEntry = {
      type: 'system',
      content: 'Conversation started',
      agent_id: startData.agent_id,
      conversation_id: startData.conversation_id,
      timestamp: startData.timestamp,
      metadata: {
        event: 'conversation_start',
        source: 'elevenlabs_webhook'
      }
    };

    await this.memoryManager.storeConversation(userUUID, conversationEntry);
  }

  // Handle conversation end
  async handleConversationEnd(userUUID, endData) {
    const conversationEntry = {
      type: 'system',
      content: 'Conversation ended',
      conversation_id: endData.conversation_id,
      timestamp: endData.timestamp,
      metadata: {
        event: 'conversation_end',
        source: 'elevenlabs_webhook'
      }
    };

    await this.memoryManager.storeConversation(userUUID, conversationEntry);
  }

  // Detect CSS stage from agent response
  detectStageFromResponse(response) {
    if (!response || typeof response !== 'string') return null;

    // Stage detection based on VASA's response keywords
    if (/contradiction|CVDC|hold.*tension|suspend|between/i.test(response)) {
      return '_'; // Suspension - Hold Liminality
    } else if (/integration|CYVC|completion|whole|unified|resolved/i.test(response)) {
      return '2'; // Completion - Articulate CYVC
    } else if (/begin|fragment|reveal|origin|start|initial/i.test(response)) {
      return '⊙'; // Pointed Origin - Reveal Fragmentation
    } else if (/gesture|movement|toward|direction|shift|change/i.test(response)) {
      return '1'; // Gesture Toward - Facilitate Thend
    } else if (/terminal|loop|end|cycle|closure|recursive/i.test(response)) {
      return '⊘'; // Terminal Symbol - Recursion or Closure
    } else if (/focus|bind|attention|concentrate|present/i.test(response)) {
      return '•'; // Focus/Bind - Introduce CVDC
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
    }
  }

  // Trigger webhook event (for testing/simulation)
  triggerWebhookEvent(webhookData) {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('elevenlabs-webhook', {
        detail: webhookData
      });
      window.dispatchEvent(event);
    }
  }

  // Store stage progression (updated to use subcollection endpoint)
  async storeStageProgression(userUUID, stageData) {
    try {
      const response = await fetch(`${this.apiUrl}/stage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userUUID,
          ...stageData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Stage progression stored in subcollection via webhook:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to store stage progression via webhook:', error);
      throw error;
    }
  }

  // Store user context (new method for subcollection)
  async storeUserContext(userUUID, contextData) {
    try {
      const response = await fetch(`${this.apiUrl}/context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userUUID,
          ...contextData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ User context stored in subcollection via webhook:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to store user context via webhook:', error);
      throw error;
    }
  }

  // Store session-specific stage progression
  async storeSessionStageProgression(userUUID, sessionId, stageData) {
    try {
      const response = await fetch(`/api/memory/session/${sessionId}/stage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userUUID,
          ...stageData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Session stage progression stored via webhook:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to store session stage progression via webhook:', error);
      throw error;
    }
  }

  // Store breakthrough moment
  async storeBreakthroughMoment(userUUID, sessionId, breakthroughData) {
    try {
      const response = await fetch(`/api/memory/session/${sessionId}/breakthrough`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userUUID,
          ...breakthroughData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Breakthrough moment stored via webhook:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to store breakthrough moment via webhook:', error);
      throw error;
    }
  }

  // Store therapeutic theme
  async storeTherapeuticTheme(userUUID, sessionId, themeData) {
    try {
      const response = await fetch(`/api/memory/session/${sessionId}/theme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userUUID,
          ...themeData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Therapeutic theme stored via webhook:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to store therapeutic theme via webhook:', error);
      throw error;
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
      /now i get it/i
    ];

    for (const indicator of breakthroughIndicators) {
      if (indicator.test(message)) {
        return {
          type: 'insight',
          trigger: 'conversation',
          description: message.substring(0, 200),
          keywords: message.match(indicator)?.[0] || ''
        };
      }
    }
    return null;
  }

  // Detect therapeutic themes
  detectTherapeuticThemes(message) {
    const themes = [];
    const themePatterns = {
      'contradiction': /contradiction|paradox|conflicting|opposing/i,
      'completion': /completion|finished|whole|complete|resolved/i,
      'fragmentation': /fragment|pieces|broken|scattered|disconnected/i,
      'integration': /integration|bringing together|unifying|connecting/i,
      'identity': /who am i|sense of self|identity|belonging/i,
      'relationship': /relationship|connection|family|friends/i,
      'trauma': /trauma|painful|hurt|wound|healing/i,
      'growth': /growth|development|progress|journey/i
    };

    for (const [theme, pattern] of Object.entries(themePatterns)) {
      if (pattern.test(message)) {
        themes.push({
          theme,
          evidence: message.substring(0, 150),
          confidence: 0.8, // Could be made more sophisticated
          timestamp: new Date().toISOString()
        });
      }
    }

    return themes;
  }
}

export default WebhookHandler;