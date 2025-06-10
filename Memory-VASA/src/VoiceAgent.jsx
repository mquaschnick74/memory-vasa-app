// Debug version - comment out problematic imports one by one
import React, { useState, useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';
import AudioVisualizer from './AudioVisualizer';

// TEST 1: Add back MemoryHooks only
import { useConversationMemory, useStageMemory, useUserProfile, useConversationContext } from './memory/MemoryHooks.js';
import { memoryManager, getMemoryManager } from './memory/MemoryHooks.js';

// STILL COMMENTED OUT:
// import WebhookHandler from './memory/WebhookHandler.js';
// import MemoryDashboard from './memory/MemoryDashboard.jsx';
// import MemoryManager from './memory/MemoryManager.js';

// Main VASA Component
const VASAInterface = () => {
  // TEST 1: Add back memory hooks usage
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

  // TEST 1: Test getMemoryManager function
  useEffect(() => {
    try {
      const manager = getMemoryManager();
      console.log('✅ Memory manager accessible:', !!manager);
    } catch (error) {
      console.error('❌ Memory manager error:', error);
    }
  }, []);

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
      <h1>VASA Debug Test - Step 1</h1>
      <p>Testing: MemoryHooks imports</p>
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
