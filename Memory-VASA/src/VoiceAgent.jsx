import React, { useState, useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import AudioVisualizer from './AudioVisualizer';
import { useConversationMemory, useStageMemory, useUserProfile, useConversationContext } from './memory/MemoryHooks.js';
import WebhookHandler from './memory/WebhookHandler.js';
import MemoryDashboard from './memory/MemoryDashboard.jsx';
import { memoryManager, getMemoryManager } from './memory/MemoryHooks.js';
import MemoryManager from './memory/MemoryManager.js';

// Main VASA Component
const VASAInterface = () => {
  // State management
  const [userUUID, setUserUUID] = useState(null);
  const [symbolicName, setSymbolicName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentStage, setCurrentStage] = useState('⊙');
  const [stageHistory, setStageHistory] = useState([]);
  const [conversationContext, setConversationContext] = useState('');
  const [micPermission, setMicPermission] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [authStep, setAuthStep] = useState('login'); // 'login', 'register', 'verify_email', 'verified'
  const [authService, setAuthService] = useState(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [agentId] = useState('nJeN1YQZyK0aTu2SoJnM'); // Hardcoded agent ID
  const [buttonState, setButtonState] = useState('resting'); // resting, connecting, connected, thinking
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showMemoryDashboard, setShowMemoryDashboard] = useState(false);

  // CSS Stage tracking
  const [isThinking, setIsThinking] = useState(false);
  const [isVASASpeaking, setIsVASASpeaking] = useState(false);
  const [sessionMemory, setSessionMemory] = useState([]); // Store conversation memory

  // Memory system hooks
  const { 
    conversationHistory, 
    addConversation, 
    isLoading: memoryLoading 
  } = useConversationMemory(userUUID);

  const { 
    recordStageTransition 
  } = useStageMemory(userUUID);

  const { 
    profile, 
    updateProfile 
  } = useUserProfile(userUUID);

  const {
    context,
    getContext
  } = useConversationContext(userUUID);

  const webhookHandlerRef = useRef(null);
  const memoryManagerRef = useRef(getMemoryManager());
  const isInitialized = useRef(false);

// Initialize AuthService
useEffect(() => {
  const initAuthService = async () => {
    try {
      // Import the browser-compatible auth service
      const { default: BrowserAuthService } = await import('./services/BrowserAuthService.js');
      const auth = new BrowserAuthService();
      setAuthService(auth);

      // Listen for auth state changes (prevent duplicate listeners)
      if (!authService) {
        auth.onAuthStateChanged(async (user) => {
          if (user) {
            setUserUUID(user.uid);
            setIsEmailVerified(user.emailVerified);
            if (user.emailVerified) {
              setAuthStep('verified');
              setIsRegistered(true);

              // Try to load the user's profile to get their symbolic name
              try {
                const manager = getMemoryManager();
                const profile = await manager.getUserProfile(user.uid);
                if (profile && profile.symbolicName) {
                  console.log('Auto-loaded profile on auth change:', profile);
                  setSymbolicName(profile.symbolicName);
                } else {
                  // If no profile or symbolicName, create/update profile with email
                  console.log('No profile found or missing symbolicName, creating/updating profile');
                  const profileData = {
                    symbolicName: user.email.split('@')[0], // Use part before @ as symbolic name
                    email: user.email,
                    lastLogin: new Date().toISOString(),
                    emailVerified: user.emailVerified
                  };

                  const manager = getMemoryManager();
                  await manager.storeUserProfile(user.uid, profileData);
                  setSymbolicName(profileData.symbolicName);
                }
              } catch (error) {
                console.error('Failed to auto-load profile:', error);
                setSymbolicName(user.email.split('@')[0] || 'User');
              }
            } else {
              setAuthStep('verify_email');
            }
          } else {
            setUserUUID(null);
            setSymbolicName('');
            setIsEmailVerified(false);
            setAuthStep('login');
            setIsRegistered(false);
          }
        });
      }
    } catch (error) {
      console.error('Failed to initialize AuthService:', error);
    }
  };

  initAuthService();
}, []);

  useEffect(() => {
    if (!webhookHandlerRef.current && memoryManagerRef.current && isInitialized.current) {
      console.log('🔄 Setting up WebhookHandler...');
      webhookHandlerRef.current = new WebhookHandler(memoryManagerRef.current);
      webhookHandlerRef.current.setupWebhookListener();
    }

    return () => {
      if (webhookHandlerRef.current && typeof webhookHandlerRef.current.cleanup === 'function') {
        webhookHandlerRef.current.cleanup();
      }
      webhookHandlerRef.current = null;
    };
  }, [isInitialized.current]);

  // Add custom styles to override any existing CSS
  const customStyles = {
    container: {
      backgroundColor: '#b23cfc',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif'
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

      const contextData = await getMemoryManager().getConversationContext(userUUID, 10);
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
            await conversation.sendMessage("Hello VASA, I'd like to begin our symbolic work together.");
          }
        }, 500);
      }
    } catch (error) {
      console.error('Failed to inject conversation context:', error);
    }
  };

  // Format conversation history into context summary
  const formatConversationContext = (history) => {
    if (!history || history.length === 0) return null;

    const summary = history.map(entry => {
      const role = entry.type === 'user' ? 'User' : 'VASA';
      const content = entry.content || entry.message || '';
      const stage = entry.stage ? ` [Stage: ${entry.stage}]` : '';
      return `${role}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}${stage}`;
    }).join('\n');

    return `Recent conversation:\n${summary}\n\nPlease reference this context in our continued conversation.`;
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
        await recordStageTransition(transitionData);
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
          addConversation(conversationEntry).catch(error => {
            console.warn('Failed to store conversation in backend:', error);
          });
        }

        // Store conversation locally and let webhook handle backend
        console.log('💬 Conversation message stored locally, webhook will handle backend storage');

        if (message.source === 'ai' && userUUID) {
          // Detect and store stage progressions
          detectAndStoreStageProgression(message.message);

          // Store user context for AI messages
          storeUserContext({
            type: 'ai_response',
            content: message.message,
            stage: currentStage,
            timestamp: new Date().toISOString()
          });
        } else if (message.source === 'user' && userUUID) {
          // Store user context for user messages
          storeUserContext({
            type: 'user_input',
            content: message.message,
            stage: currentStage,
            timestamp: new Date().toISOString()
          });
        }

        // Helper functions for stage and context storage
        async function detectAndStoreStageProgression(message) {
          const stages = ['⊙', '•', '_', '1', '2', '⊘'];

          for (const stage of stages) {
            if (message.includes(stage)) {
              console.log('🎯 Stage detected:', stage);

              try {
                await getMemoryManager().storeStageProgression(userUUID, {
                  stage: stage,
                  previousStage: currentStage,
                  message: message,
                  timestamp: new Date().toISOString(),
                  detectionMethod: 'automatic'
                });

                setCurrentStage(stage);
                console.log('📊 Stage progression stored in subcollection:', stage);
              } catch (error) {
                console.error('❌ Failed to store stage progression:', error);
              }
              break;
            }
          }
        }

        async function storeUserContext(contextData) {
          if (!userUUID) return;

          try {
            await getMemoryManager().storeUserContext(userUUID, contextData);
            console.log('📝 User context stored in subcollection:', contextData.type);
          } catch (error) {
            console.error('❌ Failed to store user context:', error);
          }
        }

        conversationHistory.push(message);
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

    // Load saved user data
    const loadUserData = () => {
      const savedUUID = localStorage.getItem('userUUID');
      const savedName = localStorage.getItem('symbolicName');
      const savedStage = localStorage.getItem('currentStage');
      const savedHistory = localStorage.getItem('stageHistory');

      if (savedUUID && savedName) {
        setUserUUID(savedUUID);
        setSymbolicName(savedName);

        // Verify the name-to-UUID mapping is still valid
        const nameMapping = localStorage.getItem(`name_${savedName}`);
        if (!nameMapping || nameMapping !== savedUUID) {
          localStorage.setItem(`name_${savedName}`, savedUUID);
        }
      }

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
    loadUserData();

     // Automatically log out user if the page is refreshed or closed
     const handleBeforeUnload = () => {
      localStorage.removeItem('userUUID');
      localStorage.removeItem('symbolicName');
      localStorage.removeItem('currentStage');
      localStorage.removeItem('stageHistory');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Save user data when it changes
  useEffect(() => {
    if (userUUID) {
      localStorage.setItem('userUUID', userUUID);
    }
    if (symbolicName) {
      localStorage.setItem('symbolicName', symbolicName);
    }
    localStorage.setItem('currentStage', currentStage);
    localStorage.setItem('stageHistory', JSON.stringify(stageHistory));
  }, [userUUID, symbolicName, currentStage, stageHistory]);

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

  // Handle user registration with email
  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !symbolicName.trim()) {
      alert('Please fill in all fields');
      return;
    }

    if (!authService) {
      alert('Authentication service not ready');
      return;
    }

    try {
      const user = await authService.createUserWithEmail(email, password);

      // Send email verification
      await authService.sendEmailVerification();

      // Store user profile with symbolic name AND email
      const profileData = {
        symbolicName,
        email,
        registrationDate: new Date().toISOString(),
        currentStage,
        sessionCount: 0,
        emailVerified: false
      };
      const manager = getMemoryManager();
      await manager.storeUserProfile(user.uid, profileData);

      setAuthStep('verify_email');
      alert('Account created! Please check your email and click the verification link.');
    } catch (error) {
      console.error('Registration failed:', error);
      alert('Registration failed: ' + error.message);
    }
  };

  // Handle user login with email
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      alert('Please enter email and password');
      return;
    }

    if (!authService) {
      alert('Authentication service not ready');
      return;
    }

    try {
      const user = await authService.signInWithEmail(email, password);

      if (user.emailVerified) {
        // Load user profile to get symbolic name
        try {
          const manager = getMemoryManager();
          const profile = await manager.getUserProfile(user.uid);
          if (profile && profile.symbolicName) {
            console.log('Profile loaded:', profile);
            setSymbolicName(profile.symbolicName);

            // Update profile with login timestamp and ensure email is stored
            await manager.storeUserProfile(user.uid, {
              lastLogin: new Date().toISOString(),
              email: user.email,
              emailVerified: user.emailVerified
            });

            setAuthStep('verified');
            setIsRegistered(true);
          } else {
            // Profile not found or missing symbolic name, create it
            console.log('No profile found or missing symbolicName, creating profile');
            const profileData = {
              symbolicName: user.email.split('@')[0], // Use part before @ as symbolic name
              email: user.email,
              lastLogin: new Date().toISOString(),
              emailVerified: user.emailVerified,
              currentStage: '⊙',
              sessionCount: 1
            };

            const manager = getMemoryManager();
            await manager.storeUserProfile(user.uid, profileData);
            setSymbolicName(profileData.symbolicName);
            setAuthStep('verified');
            setIsRegistered(true);
          }
        } catch (profileError) {
          console.error('Failed to load profile:', profileError);
          // Use email as fallback if profile loading fails
          setSymbolicName(user.email.split('@')[0] || 'User');
          setAuthStep('verified');
          setIsRegistered(true);
        }
      } else {
        setAuthStep('verify_email');
        alert('Please verify your email before continuing');
      }
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed: ' + error.message);
    }
  };

  // Check email verification status
  const checkEmailVerification = async () => {
    if (!authService) return;

    try {
      const isVerified = await authService.reloadUser();
      if (isVerified) {
        const currentUser = authService.getCurrentUser();
        setIsEmailVerified(true);
        setAuthStep('verified');
        setIsRegistered(true);

        // Load user profile with better error handling
        try {
          const manager = getMemoryManager();
          const profile = await manager.getUserProfile(currentUser.uid);
          if (profile) {
            console.log('Profile loaded after verification:', profile);
            setSymbolicName(profile.symbolicName || currentUser.email.split('@')[0] || 'User');

            // Update profile to mark email as verified
            await manager.storeUserProfile(currentUser.uid, {
              emailVerified: true,
              lastLogin: new Date().toISOString(),
              email: currentUser.email
            });
          } else {
            console.log('No profile found after verification, creating one');
            const profileData = {
              symbolicName: currentUser.email.split('@')[0] || 'User',
              email: currentUser.email,
              emailVerified: true,
              lastLogin: new Date().toISOString(),
              registrationDate: new Date().toISOString(),
              currentStage: '⊙',
              sessionCount: 1
            };

            const manager = getMemoryManager();
            await manager.storeUserProfile(currentUser.uid, profileData);
            setSymbolicName(profileData.symbolicName);
          }
        } catch (profileError) {
          console.error('Failed to load profile after verification:', profileError);
          setSymbolicName(currentUser.email.split('@')[0] || 'User');
        }

        alert('Email verified successfully! Welcome to VASA.');
      } else {
        alert('Email not yet verified. Please check your email.');
      }
    } catch (error) {
      console.error('Verification check failed:', error);
      alert('Failed to check verification status');
    }
  };

  // Resend verification email
  const resendVerificationEmail = async () => {
    if (!authService) return;

    try {
      await authService.sendEmailVerification();
      alert('Verification email sent! Please check your inbox.');
    } catch (error) {
      console.error('Failed to resend verification:', error);
      alert('Failed to send verification email');
    }
  };

  // Sign out
  const handleSignOut = async () => {
    if (!authService) return;

    try {
      await authService.signOut();
      setUserUUID(null);
      setSymbolicName('');
      setEmail('');
      setPassword('');
      setIsRegistered(false);
      setIsEmailVerified(false);
      setAuthStep('login');
      localStorage.clear();
    } catch (error) {
      console.error('Sign out failed:', error);
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
    },
    userInfo: {
      marginTop: '10px',
      fontSize: '0.9rem',
      color: '#ffffff80'
    },
    userName: {
      marginRight: '10px'
    },
    userStage: {
      marginRight: '10px'
    },
    userId: {
      marginRight: '10px'
    }
  };

  // Authentication screens
  if (!isRegistered || authStep !== 'verified') {
    return (
      <div style={{ 
        ...styles.container, 
        justifyContent: 'center', 
        alignItems: 'center',
        textAlign: 'center',
        padding: '40px'
      }}>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          padding: '40px',
          borderRadius: '20px',
          maxWidth: '500px',
          width: '100%'
        }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            marginBottom: '20px',
            background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffecd2)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundSize: '300% 300%',
            animation: 'gradient 3s ease infinite'
          }}>
            VASA
          </h1>

          {authStep === 'login' && (
            <>
              <p style={{ fontSize: '1.2rem', marginBottom: '30px', opacity: 0.9 }}>
                Sign in to your account
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                style={{
                  padding: '15px',
                  fontSize: '1.1rem',
                  border: 'none',
                  borderRadius: '10px',
                  width: '100%',
                  marginBottom: '15px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: '#333'
                }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                style={{
                  padding: '15px',
                  fontSize: '1.1rem',
                  border: 'none',
                  borderRadius: '10px',
                  width: '100%',
                  marginBottom: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: '#333'
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleLogin();
                  }
                }}
              />
              <button
                onClick={handleLogin}
                style={{
                  padding: '15px 30px',
                  fontSize: '1.1rem',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  width: '100%',
                  fontWeight: 'bold',
                  marginBottom: '15px'
                }}
              >
                Sign In
              </button>
              <button
                onClick={() => setAuthStep('register')}
                style={{
                  padding: '10px 20px',
                  fontSize: '1rem',
                  backgroundColor: 'transparent',
                  color: 'white',
                  border: '2px solid white',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Create New Account
              </button>
            </>
          )}

          {authStep === 'register' && (
            <>
              <p style={{ fontSize: '1.2rem', marginBottom: '30px', opacity: 0.9 }}>
                Create your account
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                style={{
                  padding: '15px',
                  fontSize: '1.1rem',
                  border: 'none',
                  borderRadius: '10px',
                  width: '100%',
                  marginBottom: '15px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: '#333'
                }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 characters)"
                style={{
                  padding: '15px',
                  fontSize: '1.1rem',
                  border: 'none',
                  borderRadius: '10px',
                  width: '100%',
                  marginBottom: '15px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: '#333'
                }}
              />
              <input
                type="text"
                value={symbolicName}
                onChange={(e) => setSymbolicName(e.target.value)}
                placeholder="Your symbolic name"
                style={{
                  padding: '15px',
                  fontSize: '1.1rem',
                  border: 'none',
                  borderRadius: '10px',
                  width: '100%',
                  marginBottom: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: '#333'
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleRegister();
                  }
                }}
              />
              <button
                onClick={handleRegister}
                style={{
                  padding: '15px 30px',
                  fontSize: '1.1rem',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  width: '100%',
                  fontWeight: 'bold',
                  marginBottom: '15px'
                }}
              >
                Create Account
              </button>
              <button
                onClick={() => setAuthStep('login')}
                style={{
                  padding: '10px 20px',
                  fontSize: '1rem',
                  backgroundColor: 'transparent',
                  color: 'white',
                  border: '2px solid white',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Back to SignIn
              </button>
            </>
          )}

          {authStep === 'verify_email' && (
            <>
              <p style={{ fontSize: '1.2rem', marginBottom: '20px', opacity: 0.9 }}>
                Email Verification Required
              </p>
              <p style={{ fontSize: '1rem', marginBottom: '30px', opacity: 0.8 }}>
                Please check your email and click the verification link to continue.
              </p>
              <button
                onClick={checkEmailVerification}
                style={{
                  padding: '15px 30px',
                  fontSize: '1.1rem',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  width: '100%',
                  fontWeight: 'bold',
                  marginBottom: '15px'
                }}
              >
                I've Verified My Email
              </button>
              <button
                onClick={resendVerificationEmail}
                style={{
                  padding: '10px 20px',
                  fontSize: '1rem',
                  backgroundColor: 'transparent',
                  color: 'white',
                  border: '2px solid white',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  width: '100%',
                  marginBottom: '15px'
                }}
              >
                Resend Verification Email
              </button>
              <button
                onClick={handleSignOut}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.9rem',
                  backgroundColor: 'transparent',
                  color: '#ff6b6b',
                  border: '1px solid #ff6b6b',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={customStyles.container} className="bg-black text-white flex flex-col">
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
      {/* Main Interface */}

      <div style={styles.header}>
          <h1 style={styles.title}>VASA Memory Interface</h1>

        </div>
      <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: '10px',
            paddingLeft: '20px',
            paddingRight: '20px',
            paddingBottom: '10px'
          }}
        >

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
          disabled={buttonConfig.disabled}
          style={{
            padding: '20px 40px',
            borderRadius: '50px',
            fontSize: '18px',
            fontWeight: 'bold',
            letterSpacing: '0.05em',
            border: 'none',
            cursor: buttonConfig.disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            backgroundColor: 
              buttonState === 'connecting' ? '#fbbf24' :
              buttonState === 'connected' ? '#10b981' :
              buttonState === 'thinking' ? '#3b82f6' : '#ffffff',
            color: buttonState === 'resting' ? '#b23cfc' : '#ffffff',
            animation: (buttonState === 'connecting' || buttonState === 'thinking') ? 'pulse 2s infinite' : 'none'
          }}
          onMouseOver={(e) => {
            if (!buttonConfig.disabled) {
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
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            marginTop: '24px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: conversation.status === 'connected' ? '#10b981' : '#ef4444'
              }}
            ></div>
            <span style={{ fontSize: '14px', color: '#9ca3af' }}>
              {conversation.status === 'connected' ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: micPermission ? '#10b981' : '#6b7280'
              }}
            ></div>
            <span style={{ fontSize: '14px', color: '#9ca3af' }}>
              {micPermission ? 'Ready' : 'Mic Access Needed'}
            </span>
          </div>
        </div>

        {/* User Info Section */}
        {userUUID && (
          <div style={{
            marginTop: '16px',
            fontSize: '0.9rem',
            color: '#ffffff80',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '15px'
          }}>
            <span>👤 {symbolicName || 'Unknown User'}</span>
            <button
              onClick={handleSignOut}
              style={{
                padding: '8px 16px',
                fontSize: '0.9rem',
                backgroundColor: '#ff6b6b',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Sign Out
            </button>
          </div>
        )}



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
            <span 
              style={{
                fontFamily: 'monospace',
                fontSize: '24px',
                animation: 'thendCycle 2.5s infinite steps(1)'
              }}
            >
              ⊙
            </span>
          </div>
        )}

        {/* Memory Dashboard Toggle */}
        {userUUID && (
          <button
            onClick={() => setShowMemoryDashboard(!showMemoryDashboard)}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              fontSize: '12px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showMemoryDashboard ? 'Hide' : 'Show'} Memory Dashboard
          </button>
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

      {/* Memory Dashboard */}
      <MemoryDashboard 
        userUUID={userUUID} 
        isVisible={showMemoryDashboard} 
      />
    </div>
  );
};

export default VASAInterface;
