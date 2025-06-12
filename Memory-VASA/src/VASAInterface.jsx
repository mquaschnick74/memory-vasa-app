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

  // 🆕 FIXED: Logout function with correct auth service usage
  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    try {
      console.log('🔍 Starting logout process...');
      
      // End any active conversation first
      if (conversation.status === 'connected') {
        console.log('🔍 Ending active VASA conversation...');
        await conversation.endSession();
        setButtonState('resting');
        setIsVASASpeaking(false);
        setIsThinking(false);
      }

      // ✅ FIXED: Import and use the auth service singleton correctly
      console.log('🔍 Signing out from Firebase...');
      const authService = await import('./services/BrowserAuthService.js');
      // Use the default export which is already the singleton instance
      await authService.default.signOut();

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

  // CSS Stage detection function
  const detectStage = (response) => {
    let detectedStage = currentStage; // Default to current stage

    // Stage detection based on VASA's response keywords
    if (/contradiction|CVDC|hold.*tension|suspend|between/i.test(response)) {
      detectedStage = '_'; // Suspension - Hold Liminality
    } else if (/integration|CYVC|completion|whole|unified|resolved/i.test(response)) {
      detectedStage = '2'; // Completion - Articulate CYVC
    } else if (/begin|fragment|reveal|origin|start|initial/i.test(response)) {
      detectedStage = '⊙'; // Pointed Origin - Reveal Fragmentation
    } else if (/gesture|movement|toward|direction|shift|change/i.test(response)) {
      detectedStage = '1'; // Gesture Toward - Facilitate Thend
    } else if (/terminal|loop|end|cycle|closure|recursive/i.test(response)) {
      detectedStage = '⊘'; // Terminal Symbol - Recursion or Closure
    } else if (/focus|bind|attention|concentrate|present/i.test(response)) {
      detectedStage = '•'; // Focus/Bind - Introduce CVDC
    }

    return detectedStage;
  };

  // Inject conversation context when connecting to VASA
  const injectConversationContext = async () => {
    try {
      if (!userUUID) return;

      const contextData = await getBrowserMemoryManager().getConversationContext(userUUID, 10);
      if (contextData && contextData.summary) {
        console.log('🧠 Injecting conversation context:', contextData.summary);

        // Create a more natural context injection that VASA should respond to
        const contextMessage = `Hi VASA, we've spoken before. ${contextData.summary} I'd like to continue our symbolic work from where we left off.`;

        // Send context as the first user message immediately after connection
        setTimeout(async () => {
          if (conversation.sendMessage) {
            console.log('📤 Sending context message to VASA:', contextMessage);
            await conversation.sendMessage(contextMessage);
          }
        }, 500);
      } else {
        // If no context, send a natural first message
        setTimeout(async () => {
          if (conversation.sendMessage) {
            console.log('📤 Sending initial greeting to VASA');
            await conversation.sendMessage(`Hello VASA, I'm ${profile?.profile?.personal_info?.display_name || 'ready'} to begin our symbolic work together.`);
          }
        }, 500);
      }
    } catch (error) {
      console.error('Failed to inject conversation context:', error);
    }
  };

  // Update stage history when stage changes
  const updateStageHistory = async (newStage) => {
    if (newStage !== currentStage) {
      const transitionData = {
        stage: newStage,
        timestamp: new Date().toISOString(),
        fromStage: currentStage
      };

      setStageHistory(prev => [...prev, transitionData]);
      setCurrentStage(newStage);

      // Store in persistent memory
      if (userUUID) {
        await updateStageProgression(currentStage, transitionData);
      }

      console.log(`🔄 Stage transition: ${currentStage} → ${newStage}`);
    }
  };

  const conversation = useConversation({
    onConnect: async () => {
      console.log('Connected to VASA');
      setButtonState('connected');

      // Inject conversation history context when connecting
      await injectConversationContext();
    },
    onDisconnect: () => {
      console.log('Disconnected from VASA');
      setButtonState('resting');
      setIsVASASpeaking(false);
    },
    onMessage: (message) => {
      console.log('Message:', message);

      if (message.type === 'agent_response_start') {
        setButtonState('thinking');
        setIsThinking(true);
        setIsVASASpeaking(true);
      } else if (message.type === 'agent_response_end') {
        setButtonState('connected');
        setIsThinking(false);
        setIsVASASpeaking(false);
      }

      // Handle both user and assistant messages
      if (message.message && typeof message.message === 'string') {
        const messageType = message.source === 'user' ? 'user' : 'assistant';
        const detectedStage = messageType === 'assistant' ? detectStage(message.message) : currentStage;

        if (messageType === 'assistant') {
          updateStageHistory(detectedStage);
        }

        // Store conversation in memory
        const conversationEntry = {
          type: messageType,
          content: message.message,
          stage: detectedStage,
          timestamp: new Date().toISOString(),
          message_type: message.type || 'message',
          userUUID: userUUID
        };

        setSessionMemory(prev => [...prev, conversationEntry]);

        // Store in persistent memory with better error handling
        if (userUUID) {
          console.log('💾 Storing conversation:', conversationEntry);
          storeConversation(conversationEntry).catch(error => {
            console.warn('Failed to store conversation in backend:', error);
          });
        }

        console.log('💬 Conversation message stored locally');
      }
    },
    onError: (error) => {
      console.error('Error:', error);
      setButtonState('resting');
      setIsThinking(false);
      setIsVASASpeaking(false);
    }
  });

  // Check terms acceptance and mic permission status on component mount
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
        // Stop the stream since we're just checking permission
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        setMicPermission(false);
      }
    };

    // Load saved stage data
    const loadSavedStageData = () => {
      const savedStage = localStorage.getItem('currentStage');
      const savedHistory = localStorage.getItem('stageHistory');

      if (savedStage) {
        setCurrentStage(savedStage);
      }

      if (savedHistory) {
        try {
          const history = JSON.parse(savedHistory);
          setStageHistory(history);
        } catch (error) {
          console.error('Failed to load stage history:', error);
        }
      }
    };

    checkTermsAcceptance();
    checkMicPermission();
    loadSavedStageData();
  }, []);

  // 🆕 FIXED: Auto-logout functionality with correct auth service usage
  useEffect(() => {
    let tabHiddenTime = null;
    let logoutTimer = null;

    console.log('🔍 Setting up auto-logout listeners...');

    // Function to clear all data immediately (for fast page unloads)
    const immediateCleanup = () => {
      console.log('🔍 Performing immediate cleanup...');
      localStorage.removeItem('userUUID');
      localStorage.removeItem('terms_accepted');
      localStorage.removeItem('currentStage');
      localStorage.removeItem('stageHistory');
    };

    // Function to perform full logout cleanup
    const performFullLogout = async () => {
      try {
        console.log('🔍 Performing full auto-logout...');

        // End any active conversation first
        if (conversation.status === 'connected') {
          console.log('🔍 Ending VASA conversation...');
          await conversation.endSession();
        }

        // Clear localStorage immediately
        immediateCleanup();

        // ✅ FIXED: Try Firebase signout with correct singleton usage
        try {
          const authService = await import('./services/BrowserAuthService.js');
          await authService.default.signOut();
          console.log('✅ Firebase signout successful');
        } catch (error) {
          console.log('⚠️ Firebase signout failed (page may be closing):', error.message);
        }

        console.log('✅ Auto-logout completed');
        return true;
      } catch (error) {
        console.error('🚨 Auto-logout error:', error);
        // Still clear localStorage even if other cleanup fails
        immediateCleanup();
        return false;
      }
    };

    // Handle page unload (when user closes tab/window or navigates away)
    const handleBeforeUnload = (event) => {
      console.log('🔍 beforeunload triggered - immediate logout');
      immediateCleanup();
      
      // Try to perform full logout (may not complete)
      performFullLogout().catch(console.error);
      
      // Don't prevent the page from unloading
      return undefined;
    };

    // Handle page hide (more reliable than beforeunload)
    const handlePageHide = () => {
      console.log('🔍 pagehide triggered - immediate logout');
      immediateCleanup();
      performFullLogout().catch(console.error);
    };

    // Handle visibility change (when user switches tabs)
    const handleVisibilityChange = () => {
      console.log('🔍 Visibility changed:', document.hidden ? 'hidden' : 'visible');
      
      if (document.hidden) {
        // Tab became hidden - start 5 minute timer
        tabHiddenTime = Date.now();
        console.log('⏰ Starting 5-minute auto-logout timer');
        
        logoutTimer = setTimeout(async () => {
          console.log('⏰ 5 minutes elapsed - performing auto-logout');
          await performFullLogout();
          // Reload page when they return to show login screen
          window.location.reload();
        }, 5 * 60 * 1000); // 5 minutes
        
      } else {
        // Tab became visible - check how long it was hidden
        if (logoutTimer) {
          clearTimeout(logoutTimer);
          logoutTimer = null;
          console.log('⏰ Cancelled auto-logout timer');
        }
        
        if (tabHiddenTime) {
          const hiddenDuration = Date.now() - tabHiddenTime;
          const hiddenMinutes = Math.round(hiddenDuration / 60000);
          console.log(`👁️ Tab visible again after ${hiddenMinutes} minutes`);
          
          // If hidden for more than 5 minutes, logout anyway
          if (hiddenDuration > 5 * 60 * 1000) {
            console.log('⚠️ Hidden too long - performing logout');
            performFullLogout().then(() => {
              window.location.reload();
            });
          }
          
          tabHiddenTime = null;
        }
      }
    };

    // Add all event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    console.log('✅ Auto-logout listeners attached');

    // Cleanup function
    return () => {
      console.log('🔍 Cleaning up auto-logout listeners...');
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (logoutTimer) {
        clearTimeout(logoutTimer);
        console.log('⏰ Cleared logout timer');
      }
    };
  }, [conversation.status]); // Only depend on conversation status

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

    // After accepting terms, proceed with starting session
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
    // Don't set termsAccepted to true, keeping the user from accessing VASA
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

  // Button text and styling based on state
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

  // Styles for main interface
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

        {/* Audio Visualizer - positioned above main button */}
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
        </div>

        {/* User Info Section - Show profile info instead of auth controls */}
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
          <span>You'll be automatically logged out when closing this page or after 5 minutes of inactivity</span>
        </div>

        {/* Thinking Indicator with Cycling Animation */}
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

        {/* Stage History (Debug) */}
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

      {/* Add CSS for pulse animation and CSS cycling */}
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

        @keyframes thinkingPulse {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
      `}</style>

    </div>
  );
};

export default VASAInterface;
