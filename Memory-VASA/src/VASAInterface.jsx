import React, { useState, useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';

// Real-time Audio Visualizer Component
const AudioVisualizer = ({ 
  isActive = false, 
  isSpeaking = false,
  barCount = 60 
}) => {
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const dataArrayRef = useRef(null);

  const colors = [
    '#ef4444', // red
    '#f97316', // orange  
    '#eab308', // yellow
    '#22c55e', // green
    '#06b6d4', // teal
    '#3b82f6', // blue
    '#6366f1', // indigo
    '#a855f7', // purple
    '#ec4899'  // pink
  ];

  const generateBars = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';

    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement('div');
      bar.style.width = '4px';
      bar.style.backgroundColor = colors[i % colors.length];
      bar.style.transition = 'height 0.05s ease';
      bar.style.borderRadius = '2px';
      bar.className = 'visualizer-bar';
      bar.style.height = '8px';

      container.appendChild(bar);
    }
  };

  // Initialize audio context and microphone
  const initializeAudio = async () => {
    try {
      // Create audio context
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });

      // Create microphone source
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);

      // Create analyser
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;

      // Connect microphone to analyser
      microphoneRef.current.connect(analyserRef.current);

      // Create data array for frequency data
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      console.log('Audio initialized successfully');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  };

  const animateBars = () => {
    if (!containerRef.current) return;

    const bars = containerRef.current.querySelectorAll('.visualizer-bar');

    if (isActive && analyserRef.current && dataArrayRef.current) {
      // Get real audio frequency data
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);

      bars.forEach((bar, index) => {
        // Map bar index to frequency data
        const dataIndex = Math.floor((index / barCount) * dataArrayRef.current.length);
        const audioValue = dataArrayRef.current[dataIndex] || 0;

        // Convert audio value to height (0-255 -> 8-120px)
        const height = Math.max(8, (audioValue / 255) * 120 + 8);
        bar.style.height = `${height}px`;
      });
    } else {
      // Gentle idle animation when not active
      bars.forEach((bar, index) => {
        const height = Math.random() * 12 + 6;
        bar.style.height = `${height}px`;
      });
    }

    animationRef.current = requestAnimationFrame(animateBars);
  };

  const stopAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    if (containerRef.current) {
      const bars = containerRef.current.querySelectorAll('.visualizer-bar');
      bars.forEach(bar => {
        bar.style.height = '8px';
      });
    }
  };

  const cleanup = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  useEffect(() => {
    generateBars();

    // Initialize audio when component mounts
    initializeAudio();

    return cleanup;
  }, []);

  // Request microphone permission when component mounts
  useEffect(() => {
    const requestInitialMicPermission = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone permission granted on page load');
      } catch (error) {
        console.log('Microphone permission not granted on page load - will request later');
      }
    };

    requestInitialMicPermission();
  }, []);

  useEffect(() => {
    if (isActive) {
      // Resume audio context if suspended
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      animateBars();
    } else {
      stopAnimation();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  // Idle animation when not active
  useEffect(() => {
    if (!isActive) {
      const idleAnimation = setInterval(() => {
        if (!containerRef.current) return;

        const bars = containerRef.current.querySelectorAll('.visualizer-bar');
        bars.forEach((bar) => {
          const height = Math.random() * 12 + 6;
          bar.style.height = `${height}px`;
        });
      }, 2000);

      return () => clearInterval(idleAnimation);
    }
  }, [isActive]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'end',
      justifyContent: 'center',
      height: '128px',
      width: '100%',
      maxWidth: '1024px',
      padding: '0 32px'
    }}>
      <div 
        ref={containerRef} 
        style={{
          display: 'flex',
          alignItems: 'end',
          gap: '2px'
        }}
      />
    </div>
  );
};

// Main VASA Component
const VASAInterface = () => {
  const [agentId] = useState('nJeN1YQZyK0aTu2SoJnM'); // Hardcoded agent ID
  const [micPermission, setMicPermission] = useState(false);
  const [buttonState, setButtonState] = useState('resting'); // resting, connecting, connected, thinking

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
      // You can add logic here to detect when AI is thinking/processing
      if (message.type === 'agent_response_start') {
        setButtonState('thinking');
      } else if (message.type === 'agent_response_end') {
        setButtonState('connected');
      }
    },
    onError: (error) => {
      console.error('Error:', error);
      setButtonState('resting');
    }
  });

  // Check mic permission status on component mount
  useEffect(() => {
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

    checkMicPermission();
  }, []);

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

  // Handle main button click
  const handleMainButtonClick = async () => {
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

  const buttonConfig = getButtonConfig();

  return (
    <div style={customStyles.container} className="bg-black text-white flex flex-col">
      {/* Global CSS Reset */}
      <style jsx global>{`
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
      {/* Main Interface */}
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

        {/* Audio Visualizer - positioned just below status indicators */}
        <div style={{ 
          marginTop: '1px',
          display: 'flex',
          justifyContent: 'center',
          width: '100%'
        }}>
          <AudioVisualizer 
            isActive={conversation.status === 'connected'} 
            isSpeaking={conversation.isSpeaking || buttonState === 'thinking'}
          />
        </div>
      </div>

      {/* Add CSS for pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>
    </div>
  );
};

export default VASAInterface;