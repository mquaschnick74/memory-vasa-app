import React, { useState, useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import AudioVisualizer from './AudioVisualizer';

// TEST: Import ONLY the hook functions, NOT MemoryManager
import { useConversationMemory, useStageMemory, useUserProfile, useConversationContext } from './memory/MemoryHooks.js';

// DO NOT IMPORT THESE YET:
// import { memoryManager, getMemoryManager } from './memory/MemoryHooks.js';
// import MemoryManager from './memory/MemoryManager.js';

// Main VASA Component
const VASAInterface = () => {
  const [userUUID, setUserUUID] = useState(null);
  const [symbolicName, setSymbolicName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentStage, setCurrentStage] = useState('⊙');
  const [micPermission, setMicPermission] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [authStep, setAuthStep] = useState('login');
  const [authService, setAuthService] = useState(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [agentId] = useState('nJeN1YQZyK0aTu2SoJnM');
  const [buttonState, setButtonState] = useState('resting');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // TEST: Try using the hooks (this will test if MemoryManager is the problem)
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

  // SIMPLIFIED AUTH INIT
  useEffect(() => {
    const initAuthService = async () => {
      try {
        const { default: BrowserAuthService } = await import('./services/BrowserAuthService.js');
        const auth = new BrowserAuthService();
        setAuthService(auth);
        console.log('✅ Auth service initialized');
      } catch (error) {
        console.error('❌ Failed to initialize AuthService:', error);
      }
    };

    initAuthService();
  }, []);

  // SIMPLIFIED CONVERSATION HANDLER
  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to VASA');
      setButtonState('connected');
    },
    onDisconnect: () => {
      console.log('Disconnected from VASA');
      setButtonState('resting');
    },
    onMessage: (message) => {
      console.log('Message:', message);
    },
    onError: (error) => {
      console.error('Error:', error);
      setButtonState('resting');
    }
  });

  // SIMPLIFIED BUTTON HANDLER
  const handleMainButtonClick = async () => {
    if (buttonState === 'resting') {
      setButtonState('connecting');
      try {
        await conversation.startSession({ agentId: agentId });
      } catch (error) {
        console.error('Failed to connect:', error);
        setButtonState('resting');
      }
    } else {
      await conversation.endSession();
      setButtonState('resting');
    }
  };

  return (
    <div style={{
      backgroundColor: '#b23cfc',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1>VASA Debug Test - Step 1.1</h1>
      <p>Testing: Individual MemoryHooks (NOT MemoryManager)</p>
      <p>Memory Loading: {memoryLoading ? 'Yes' : 'No'}</p>
      <p>Conversation History: {conversationHistory?.length || 0} items</p>
      
      <button
        onClick={handleMainButtonClick}
        style={{
          padding: '20px 40px',
          borderRadius: '50px',
          fontSize: '18px',
          fontWeight: 'bold',
          border: 'none',
          cursor: 'pointer',
          backgroundColor: buttonState === 'resting' ? '#ffffff' : '#10b981',
          color: buttonState === 'resting' ? '#b23cfc' : '#ffffff'
        }}
      >
        {buttonState === 'resting' ? 'TEST VASA' : 'CONNECTED'}
      </button>
      
      <p style={{ marginTop: '20px', fontSize: '14px' }}>
        Button State: {buttonState}
      </p>
    </div>
  );
};

export default VASAInterface;
