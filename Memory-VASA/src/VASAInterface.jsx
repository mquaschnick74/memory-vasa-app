import React, { useState, useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import AudioVisualizer from './AudioVisualizer';

// BROWSER-ONLY MEMORY HOOKS (no server dependencies)
import { useConversationMemory, useStageMemory, useUserProfile, useConversationContext, getBrowserMemoryManager } from './memory/BrowserMemoryHooks.js';

// Main VASA Component (Auth logic removed - handled by App.jsx ProfileGuard)
const VASAInterface = () => {
  // Get userUUID from localStorage (set by ProfileGuard in App.jsx)
  const [userUUID] = useState(() => localStorage.getItem('userUUID'));
  const [currentStage, setCurrentStage] = useState('⊙');
  const [stageHistory, setStageHistory] = useState([]);
  const [micPermission, setMicPermission] = useState(false);
  const [agentId] = useState('nJeN1YQZyK0aTu2SoJnM'); // Hardcoded agent ID
  const [buttonState, setButtonState] = useState('resting'); // resting, connecting, connected, thinking
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // CSS Stage tracking
  const [isThinking, setIsThinking] = useState(false);
  const [isVASASpeaking, setIsVASASpeaking] = useState(false);
  const [sessionMemory, setSessionMemory] = useState([]); // Store conversation memory

  // 🆕 ADD THIS: Logout state
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 🆕 Enhanced conversation tracking
  const [conversationId, setConversationId] = useState(null);
  const [memoryInjected, setMemoryInjected] = useState(false);

  // Memory system hooks
  const { 
    conversations,
    storeConversation, 
    loading: memoryLoading 
  } = useConversationMemory(userUUID);

  const { 
    updateStageProgression 
  } = useStageMemory(userUUID);

  const { 
    profile 
  } = useUserProfile(userUUID);

  const {
    context
  } = useConversationContext(userUUID);

  // 🆕 ENHANCED: More robust context retrieval with fallbacks
  const retrieveStoredContext = async (userUUID, conversationId) => {
    try {
      console.log('🧠 Retrieving stored context for user:', userUUID);
      
      // Method 1: Try your backend API first
      try {
        const response = await fetch('/api/get-conversation-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userUUID,
            conversation_id: conversationId,
            limit: 20
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Retrieved stored context from backend:', data);
          return data.context_summary || '';
        }
      } catch (backendError) {
        console.warn('⚠️ Backend context retrieval failed, trying browser memory:', backendError);
      }

      // Method 2: Fallback to browser memory
      const memoryManager = getBrowserMemoryManager();
      const contextData = await memoryManager.getConversationContext(userUUID, 10);
      
      if (contextData && contextData.summary) {
        console.log('✅ Retrieved context from browser memory:', contextData.summary);
        return contextData.summary;
      }

      // Method 3: Use recent conversations from memory hooks
      if (conversations && conversations.length > 0) {
        const recentConversations = conversations.slice(-5);
        const contextSummary = recentConversations
          .map(conv => `${conv.type}: ${conv.content.slice(0, 100)}`)
          .join('\n');
        console.log('✅ Created context from recent conversations');
        return contextSummary;
      }

      console.log('ℹ️ No stored context found');
      return '';
    } catch (error) {
      console.error('❌ Failed to retrieve stored context:', error);
      return '';
    }
  };

  // 🆕 ENHANCED: Better memory injection with conversation state tracking
  const injectConversationContext = async () => {
    try {
      if (!userUUID || memoryInjected) {
        console.log('🧠 Skipping context injection:', { userUUID: !!userUUID, memoryInjected });
        return;
      }

      console.log('🧠 Starting context injection...');
      setMemoryInjected(true);

      // Get stored context from multiple sources
      const storedContext = await retrieveStoredContext(userUUID, conversationId);
      
      // Get current profile info for personalization
      const userName = profile?.profile?.personal_info?.display_name || 'friend';
      const userGoals = profile?.profile?.therapeutic_goals?.[0] || 'personal growth';

      // Create a more natural context injection
      let contextMessage = '';
      
      if (storedContext.trim()) {
        contextMessage = `Hello VASA, I'm ${userName} and we've spoken before. Here's what we've been working on: ${storedContext.trim()} I'd like to continue our symbolic work from where we left off, focusing on ${userGoals}.`;
      } else {
        contextMessage = `Hello VASA, I'm ${userName} and I'm here for our symbolic work together. I'm focused on ${userGoals} and ready to begin at stage ${currentStage}.`;
      }

      // Send context message after a brief delay
      setTimeout(async () => {
        if (conversation.sendMessage && conversation.status === 'connected') {
          console.log('📤 Injecting conversation context:', contextMessage);
          try {
            await conversation.sendMessage(contextMessage);
            console.log('✅ Context injection successful');
          } catch (error) {
            console.error('❌ Context injection failed:', error);
            setMemoryInjected(false); // Reset to allow retry
          }
        }

    } catch (error) {
      console.error('❌ Context injection error:', error);
      setMemoryInjected(false); // Reset to allow retry
    }
  };

  // 🆕 ENHANCED: Logout function with better cleanup
  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    try {
      console.log('🔍 Starting logout process...');
      
      // End any active conversation first
      if (conversation.status === 'connected') {
        console.log('🔍 Ending active VASA conversation...');
        try {
          await conversation.endSession();
        } catch (error) {
          console.warn('⚠️ Error ending conversation:', error);
        }
        setButtonState('resting');
        setIsVASASpeaking(false);
        setIsThinking(false);
      }

      // Sign out from Firebase
      console.log('🔍 Signing out from Firebase...');
      try {
        const { getBrowserAuthService } = await import('./services/BrowserAuthService.js');
        const authService = getBrowserAuthService();
        await authService.signOut();
        console.log('✅ Firebase signout successful');
      } catch (error) {
        console.warn('⚠️ Firebase signout failed:', error);
      }

      // Clear all localStorage data
      console.log('🔍 Clearing localStorage data...');
      localStorage.removeItem('userUUID');
      localStorage.removeItem('terms_accepted');
      localStorage.removeItem('currentStage');
      localStorage.removeItem('stageHistory');

      console.log('✅ Logout completed successfully');
      
      // Refresh the page to return to login screen
      window.location.reload();
      
    } catch (error) {
      console.error('🚨 Logout failed:', error);
      alert('Logout failed. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // CSS Stage detection function (enhanced with better patterns)
  const detectStage = (response) => {
    let detectedStage = currentStage; // Default to current stage

    // Enhanced stage detection with more patterns
    if (/contradiction|paradox|tension|suspend|between|liminal|threshold/i.test(response)) {
      detectedStage = '_'; // Suspension - Hold Liminality
    } else if (/integration|completion|whole|unified|resolved|synthesis|unity/i.test(response)) {
      detectedStage = '2'; // Completion - Articulate CYVC
    } else if (/begin|fragment|reveal|origin|start|initial|source|emergence/i.test(response)) {
      detectedStage = '⊙'; // Pointed Origin - Reveal Fragmentation
    } else if (/gesture|movement|toward|direction|shift|change|transition|flow/i.test(response)) {
      detectedStage = '1'; // Gesture Toward - Facilitate Thend
    } else if (/terminal|loop|end|cycle|closure|recursive|return|completion/i.test(response)) {
      detectedStage = '⊘'; // Terminal Symbol - Recursion or Closure
    } else if (/focus|bind|attention|concentrate|present|awareness|centering/i.test(response)) {
      detectedStage = '•'; // Focus/Bind - Introduce CVDC
    }

    return detectedStage;
  };

  // Update stage history when stage changes
  const updateStageHistory = async (newStage) => {
    if (newStage !== currentStage) {
      const transitionData = {
        stage: newStage,
        timestamp: new Date().toISOString(),
        fromStage: currentStage,
        conversationId: conversationId
      };

      setStageHistory(prev => [...prev, transitionData]);
      setCurrentStage(newStage);

      // Store in persistent memory
      if (userUUID) {
        try {
          await updateStageProgression(currentStage, transitionData);
        } catch (error) {
          console.warn('Failed to store stage progression:', error);
        }
      }

      console.log(`🔄 Stage transition: ${currentStage} → ${newStage}`);
    }
  };

  // 🆕 ENHANCED: Better conversation storage with error handling
  const storeConversationMessage = async (messageData) => {
    try {
      // Add to session memory immediately
      setSessionMemory(prev => [...prev, messageData]);

      // Store in persistent memory with retry logic
      if (userUUID) {
        console.log('💾 Storing conversation message:', messageData);
        
        try {
          await storeConversation(messageData);
          console.log('✅ Message stored in persistent memory');
        } catch (error) {
          console.warn('⚠️ Failed to store in persistent memory, retrying...', error);
          
          // Retry once after a delay
          setTimeout(async () => {
            try {
              await storeConversation(messageData);
              console.log('✅ Message stored on retry');
            } catch (retryError) {
              console.error('❌ Final storage attempt failed:', retryError);
            }
          }, 2000);
        }
      }
    } catch (error) {
      console.error('❌ Error in storeConversationMessage:', error);
    }
  };

  const conversation = useConversation({
    onConnect: async () => {
      console.log('✅ Connected to VASA');
      setButtonState('connected');
      setMemoryInjected(false); // Reset for new connection

      // Store conversation ID for tracking
      if (conversation?.conversationId) {
        setConversationId(conversation.conversationId);
        console.log('🆔 Conversation ID set:', conversation.conversationId);
      }

      // 🆕 Register conversation with backend for webhook tracking (optional)
      try {
        const response = await fetch('/api/start-conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userUUID, 
            agentId,
            conversationId: conversation?.conversationId 
          })
        });
        
        if (response.ok) {
          console.log('✅ Conversation registered with backend');
        }
      } catch (error) {
        console.warn('⚠️ Backend registration failed (continuing anyway):', error);
      }

      // Inject conversation context
      await injectConversationContext();
    },
    
    onDisconnect: () => {
      console.log('❌ Disconnected from VASA');
      setButtonState('resting');
      setIsVASASpeaking(false);
      setIsThinking(false);
      setMemoryInjected(false);
      setConversationId(null);
    },
    
    onMessage: (message) => {
      console.log('📨 Message received:', message);

      // Handle conversation state updates
      if (message.type === 'agent_response_start') {
        setButtonState('thinking');
        setIsThinking(true);
        setIsVASASpeaking(true);
      } else if (message.type === 'agent_response_end') {
        setButtonState('connected');
        setIsThinking(false);
        setIsVASASpeaking(false);
      }

      // Process actual message content
      if (message.message && typeof message.message === 'string') {
        const messageType = message.source === 'user' ? 'user' : 'assistant';
        const detectedStage = messageType === 'assistant' ? detectStage(message.message) : currentStage;

        // Update stage if it changed
        if (messageType === 'assistant') {
          updateStageHistory(detectedStage);
        }

        // Create conversation entry
        const conversationEntry = {
          type: messageType,
          content: message.message,
          stage: detectedStage,
          timestamp: new Date().toISOString(),
          message_type: message.type || 'message',
          userUUID: userUUID,
          conversationId: conversationId
        };

        // Store the message
        storeConversationMessage(conversationEntry);
      }
    },
    
    onError: (error) => {
      console.error('❌ VASA Error:', error);
      setButtonState('resting');
      setIsThinking(false);
      setIsVASASpeaking(false);
      setMemoryInjected(false);
    }
  });

  // 🆕 ENHANCED: Auto-logout with better cleanup
  useEffect(() => {
    let tabHiddenTime = null;
    let logoutTimer = null;

    const immediateCleanup = () => {
      console.log('🧹 Immediate cleanup triggered');
      localStorage.removeItem('userUUID');
      localStorage.removeItem('terms_accepted');
      localStorage.removeItem('currentStage');
      localStorage.removeItem('stageHistory');
    };

    const performFullLogout = async () => {
      try {
        console.log('🚪 Performing full logout...');

        // End conversation
        if (conversation.status === 'connected') {
          try {
            await conversation.endSession();
          } catch (error) {
            console.warn('Error ending conversation:', error);
          }
        }

        // Clear data
        immediateCleanup();

        // Firebase signout
        try {
          const { getBrowserAuthService } = await import('./services/BrowserAuthService.js');
          const authService = getBrowserAuthService();
          await authService.signOut();
        } catch (error) {
          console.warn('Firebase signout failed:', error);
        }

        return true;
      } catch (error) {
        console.error('Auto-logout error:', error);
        immediateCleanup();
        return false;
      }
    };

    const handleBeforeUnload = () => {
      immediateCleanup();
      performFullLogout().catch(console.error);
    };

    const handlePageHide = () => {
      immediateCleanup();
      performFullLogout().catch(console.error);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabHiddenTime = Date.now();
        console.log('⏰ Starting 5-minute logout timer');
        
        logoutTimer = setTimeout(async () => {
          console.log('⏰ Auto-logout triggered');
          await performFullLogout();
          window.location.reload();
        }, 5 * 60 * 1000);
        
      } else {
        if (logoutTimer) {
          clearTimeout(logoutTimer);
          logoutTimer = null;
        }
        
        if (tabHiddenTime) {
          const hiddenDuration = Date.now() - tabHiddenTime;
          if (hiddenDuration > 5 * 60 * 1000) {
            performFullLogout().then(() => window.location.reload());
          }
          tabHiddenTime = null;
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (logoutTimer) clearTimeout(logoutTimer);
    };
  }, [conversation.status]);

  // Load saved data on mount
  useEffect(() => {
    const checkTermsAcceptance = () => {
      const termsAcceptedStored = localStorage.getItem('terms_accepted');
      if (termsAcceptedStored === 'true') {
        setTermsAccepted(true);
      }
    };

    const checkMicPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicPermission(true);
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        setMicPermission(false);
      }
    };

    const loadSavedStageData = () => {
      const savedStage = localStorage.getItem('currentStage');
      const savedHistory = localStorage.getItem('stageHistory');

      if (savedStage) setCurrentStage(savedStage);
      if (savedHistory) {
        try {
          setStageHistory(JSON.parse(savedHistory));
        } catch (error) {
          console.error('Failed to load stage history:', error);
        }
      }
    };

    checkTermsAcceptance();
    checkMicPermission();
    loadSavedStageData();
  }, []);

  // Save stage data when it changes
  useEffect(() => {
    localStorage.setItem('currentStage', currentStage);
    localStorage.setItem('stageHistory', JSON.stringify(stageHistory));
  }, [currentStage, stageHistory]);

  // Request microphone permission
  const requestMicPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission(true);
      return true;
    } catch (error) {
      console.error('Microphone access denied');
      alert('Microphone access is required for voice chat');
      return false;
    }
  };

  // Handle terms acceptance
  const handleAcceptTerms = async () => {
    localStorage.setItem('terms_accepted', 'true');
    setTermsAccepted(true);
    setShowTermsModal(false);

    if (!micPermission) {
      const granted = await requestMicPermission();
      if (!granted) return;
    }

    setButtonState('connecting');

    try {
      await conversation.startSession({ agentId: agentId });
    } catch (error) {
      console.error('Failed to connect:', error);
      setButtonState('resting');
      alert('Failed to connect. Please try again.');
    }
  };

  const handleDeclineTerms = () => {
    setShowTermsModal(false);
  };

  // Handle main button click
  const handleMainButtonClick = async () => {
    if (!termsAccepted) {
      setShowTermsModal(true);
      return;
    }
    
    if (buttonState === 'resting') {
      if (!micPermission) {
        const granted = await requestMicPermission();
        if (!granted) return;
      }

      setButtonState('connecting');

      try {
        await conversation.startSession({ agentId: agentId });
      } catch (error) {
        console.error('Failed to connect:', error);
        setButtonState('resting');
        alert('Failed to connect. Please try again.');
      }
    } else if (buttonState === 'connected' || buttonState === 'thinking') {
      await conversation.endSession();
      setButtonState('resting');
    }
  };

  // Button configuration
  const getButtonConfig = () => {
    switch (buttonState) {
      case 'connecting':
        return {
          text: 'CONNECTING...',
          className: 'bg-yellow-500 hover:bg-yellow-600 animate-pulse',
          disabled: true
        };
      case 'connected':
        return {
          text: 'SPEAK NATURALLY',
          className: 'bg-green-500 hover:bg-green-600',
          disabled: false
        };
      case 'thinking':
        return {
          text: 'VASA THINKING...',
          className: 'bg-blue-500 hover:bg-blue-600 animate-pulse',
          disabled: true
        };
      default:
        return {
          text: 'TALK TO VASA',
          className: 'bg-white hover:bg-gray-100 text-black',
          disabled: false
        };
    }
  };

  // Helper function to get stage descriptions
  const getStageDescription = (stage) => {
    const descriptions = {
      '⊙': 'Pointed Origin — Reveal',
      '•': 'Focus/Bind — Introduce CVDC', 
      '_': 'Suspension — Hold Liminality',
      '1': 'Gesture Toward — Facilitate Thend',
      '2': 'Completion — Articulate CYVC',
      '⊘': 'Terminal Symbol — Recursion or Closure'
    };
    return descriptions[stage] || 'Unknown Stage';
  };

  const buttonConfig = getButtonConfig();

  // Show error if no userUUID (should not happen with ProfileGuard)
  if (!userUUID) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#b23cfc',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <p>Authentication required. Please refresh the page.</p>
      </div>
    );
  }

  // Main interface styles
  const styles = {
    container: {
      backgroundColor: '#b23cfc',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      height: '100vh',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    header: {
      width: '100%',
      textAlign: 'center',
      marginBottom: '20px'
    },
    title: {
      fontSize: '2rem',
      fontWeight: 'bold'
    }
  };

  return (
    <div style={styles.container} className="bg-black text-white flex flex-col">
      {/* Global CSS Reset */}
      <style>{`
        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
          overflow-x: hidden;
        }
        * {
          box-sizing: border-box;
        }
      `}</style>

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            color: '#000000',
            padding: '32px',
            borderRadius: '12px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              marginBottom: '20px',
              color: '#1f2937'
            }}>
              Terms and Conditions
            </h2>

            <div style={{
              fontSize: '16px',
              lineHeight: '1.6',
              marginBottom: '24px',
              color: '#374151'
            }}>
              <p>
                By clicking <strong>"Agree,"</strong> and each time I interact with this AI agent, I consent to the recording, storage, and sharing of my communications with third-party service providers, and as described in the Privacy Policy.
              </p>
              <p style={{ marginTop: '16px' }}>
                If you do not wish to have your conversations recorded, please refrain from using this service.
              </p>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={handleDeclineTerms}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6b7280',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#6b7280'}
              >
                Decline
              </button>
              <button
                onClick={handleAcceptTerms}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#b23cfc',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#9333ea'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#b23cfc'}
              >
                Agree
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Interface with Logout Button */}
      <div style={styles.header}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          width: '100%',
          position: 'relative'
        }}>
          {/* Left spacer */}
          <div style={{ width: '100px' }}></div>
          
          {/* Centered title */}
          <h1 style={{
            ...styles.title,
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            margin: 0
          }}>
            VASA Memory Interface
          </h1>
          
          {/* Right-aligned Logout Button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: '#ff6b6b',
              border: '2px solid #ff6b6b',
              borderRadius: '20px',
              fontSize: '14px',
              cursor: isLoggingOut ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              fontWeight: 'bold',
              opacity: isLoggingOut ? 0.6 : 1,
              zIndex: 10,
              minWidth: '80px',
              textAlign: 'center'
            }}
            onMouseOver={(e) => {
              if (!isLoggingOut) {
                e.target.style.backgroundColor = '#ff6b6b';
                e.target.style.color = '#ffffff';
              }
            }}
            onMouseOut={(e) => {
              if (!isLoggingOut) {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#ff6b6b';
              }
            }}
          >
            {isLoggingOut ? 'Logging Out...' : 'Logout'}
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: '10px',
        paddingLeft: '20px',
        paddingRight: '20px',
        paddingBottom: '10px'
      }}>

        {/* Core Symbol Set Display */}
        <div style={{
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '20px',
          fontSize: '48px',
          fontFamily: 'monospace'
        }}>
          {['⊙', '•', '_', '1', '2', '⊘'].map((symbol, index) => (
            <span
              key={symbol}
              style={{
                opacity: currentStage === symbol ? 1 : 0.3,
                transform: currentStage === symbol ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.3s ease',
                color: currentStage === symbol ? '#ffffff' : '#ffffff80',
                textShadow: currentStage === symbol ? '0 0 10px #ffffff' : 'none',
                cursor: 'default',
                userSelect: 'none'
              }}
              title={getStageDescription(symbol)}
            >
              {symbol}
            </span>
          ))}
        </div>

        {/* Stage Description */}
        <div style={{
          marginBottom: '1px',
          fontSize: '14px',
          color: '#ffffff80',
          textAlign: 'center',
          minHeight: '20px'
        }}>
          {getStageDescription(currentStage)}
        </div>

        {/* Audio Visualizer */}
        <div style={{ 
          marginTop: '1px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'center',
          width: '100%'
        }}>
          <AudioVisualizer 
            isActive={conversation.status === 'connected'} 
            isSpeaking={conversation.isSpeaking && !isVASASpeaking}
            isVASASpeaking={isVASASpeaking}
          />
        </div>

        {/* Main Button */}
        <button
          onClick={handleMainButtonClick}
          disabled={buttonConfig.disabled || isLoggingOut}
          style={{
            padding: '20px 40px',
            borderRadius: '50px',
            fontSize: '18px',
            fontWeight: 'bold',
            letterSpacing: '0.05em',
            border: 'none',
            cursor: (buttonConfig.disabled || isLoggingOut) ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            backgroundColor: 
              buttonState === 'connecting' ? '#fbbf24' :
              buttonState === 'connected' ? '#10b981' :
              buttonState === 'thinking' ? '#3b82f6' : '#ffffff',
            color: buttonState === 'resting' ? '#b23cfc' : '#ffffff',
            animation: (buttonState === 'connecting' || buttonState === 'thinking') ? 'pulse 2s infinite' : 'none',
            opacity: isLoggingOut ? 0.6 : 1
          }}
          onMouseOver={(e) => {
            if (!buttonConfig.disabled && !isLoggingOut) {
              e.target.style.transform = 'scale(1.05)';
            }
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'scale(1)';
          }}
        >
          {buttonConfig.text}
        </button>

        {/* Status Indicators */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          marginTop: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: conversation.status === 'connected' ? '#10b981' : '#ef4444'
            }}></div>
            <span style={{ fontSize: '14px', color: '#9ca3af' }}>
              {conversation.status === 'connected' ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: micPermission ? '#10b981' : '#6b7280'
            }}></div>
            <span style={{ fontSize: '14px', color: '#9ca3af' }}>
              {micPermission ? 'Ready' : 'Mic Access Needed'}
            </span>
          </div>
          {/* 🆕 Memory Status Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: sessionMemory.length > 0 ? '#10b981' : '#6b7280'
            }}></div>
            <span style={{ fontSize: '14px', color: '#9ca3af' }}>
              Memory ({sessionMemory.length})
            </span>
          </div>
        </div>

        {/* User Info Section */}
        {profile && (
          <div style={{
            marginTop: '16px',
            fontSize: '0.9rem',
            color: '#ffffff80',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '15px'
          }}>
            <span>👤 {profile.profile?.personal_info?.display_name || 'User'}</span>
            <span>🎯 {profile.profile?.therapeutic_goals?.[0] || 'General Growth'}</span>
          </div>
        )}

        {/* Security Notice */}
        <div style={{
          marginTop: '12px',
          fontSize: '0.75rem',
          color: '#ffffff40',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <span>🔒</span>
          <span>Auto-logout after 5 minutes inactive or when closing page</span>
        </div>

        {/* Thinking Indicator */}
        {isThinking && (
          <div style={{
            marginTop: '16px',
            fontSize: '18px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <span>VASA is thinking...</span>
            <span style={{
              fontFamily: 'monospace',
              fontSize: '24px',
              animation: 'thendCycle 2.5s infinite steps(1)'
            }}>
              ⊙
            </span>
          </div>
        )}

        {/* Stage History (Collapsible Debug) */}
        {stageHistory.length > 0 && (
          <details style={{
            marginTop: '24px',
            fontSize: '12px',
            color: '#ffffff60',
            textAlign: 'left',
            maxWidth: '400px'
          }}>
            <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
              Stage History ({stageHistory.length} transitions)
            </summary>
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              padding: '8px',
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '4px'
            }}>
              {stageHistory.slice(-10).map((entry, idx) => (
                <div key={idx} style={{ marginBottom: '4px' }}>
                  {entry.fromStage} → {entry.stage} ({new Date(entry.timestamp).toLocaleTimeString()})
                </div>
              ))}
            </div>
          </details>
        )}

      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }

        @keyframes thendCycle {
          0%   { content: "⊙"; }
          16%  { content: "•"; }
          32%  { content: "_"; }
          48%  { content: "1"; }
          64%  { content: "2"; }
          80%  { content: "⊘"; }
          100% { content: "⊙"; }
        }
      `}</style>

    </div>
  );
};

export default VASAInterface;
