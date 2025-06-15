import React from 'react';
import { Conversation } from '@elevenlabs/react';

// Complete VASA interface with real ElevenLabs voice chat
const VASACompleteInterface = () => {
  const [currentView, setCurrentView] = React.useState('voice');
  const [connectionStatus, setConnectionStatus] = React.useState('disconnected');
  const [conversationActive, setConversationActive] = React.useState(false);
  const [memoryContext, setMemoryContext] = React.useState(null);
  const [conversationId, setConversationId] = React.useState(null);

  // User info
  const user = {
    uid: 'AVs5XlU6qQezh8GiNlRwN6UEfjM2',
    email: 'mquaschnick@icloud.com'
  };

  // Load memory context and force refresh
  React.useEffect(() => {
    loadUserMemoryContext();
  }, []);

  const loadUserMemoryContext = async () => {
    try {
      console.log('🔄 Force refreshing memory status...');
      
      // Add cache busting
      const timestamp = Date.now();
      const statusResponse = await fetch(`/api/webhook?test=true&_t=${timestamp}`);
      const statusResult = await statusResponse.json();
      
      console.log('🔍 Fresh Mem0 status:', statusResult);
      
      if (statusResult.mem0_working) {
        setConnectionStatus('ready');
        console.log('✅ Mem0 is working!');
      } else {
        setConnectionStatus('fallback');
        console.log('⚠️ Mem0 in fallback mode');
      }

      // Get user memory context
      const response = await fetch('/api/get-conversation-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.uid,
          limit: 10
        })
      });
      const result = await response.json();
      
      console.log('🧠 Memory context:', result);
      
      if (result.success) {
        setMemoryContext(result);
      }
    } catch (error) {
      console.error('❌ Memory context load failed:', error);
      setConnectionStatus('disconnected');
    }
  };

  const startVoiceConversation = async () => {
    try {
      console.log('🎤 Starting voice conversation...');
      
      const newConversationId = 'vasa-' + Date.now();
      setConversationId(newConversationId);
      
      // Register conversation with webhook
      const webhookResponse = await fetch('/api/start-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUUID: user.uid,
          agentId: 'nJeN1YQZyK0aTu2SoJnM',
          conversationId: newConversationId
        })
      });
      
      const webhookResult = await webhookResponse.json();
      console.log('🔗 Webhook registration:', webhookResult);

      if (webhookResult.success) {
        setConversationActive(true);
        console.log('✅ Conversation registered, memory context loaded. Starting ElevenLabs voice chat...');
      } else {
        console.error('❌ Webhook registration failed:', webhookResult);
        alert('Failed to register conversation with memory system');
      }
    } catch (error) {
      console.error('❌ Failed to start conversation:', error);
      alert('Failed to start conversation: ' + error.message);
    }
  };

  const endConversation = () => {
    console.log('🛑 Ending conversation...');
    setConversationActive(false);
    setConversationId(null);
    
    // Reload memory context to get any new memories
    setTimeout(() => {
      loadUserMemoryContext();
    }, 2000);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'ready': return '#10B981';
      case 'fallback': return '#F59E0B';
      default: return '#EF4444';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'ready': return 'Memory Active';
      case 'fallback': return 'Fallback Mode';
      default: return 'Connecting...';
    }
  };

  // Voice Interface with ElevenLabs Integration
  const VoiceInterfaceView = () => (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #b23cfc 0%, #8b5cf6 100%)',
      color: 'white',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '2.5rem',
            height: '2.5rem',
            background: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '1.25rem',
              height: '1.25rem',
              background: '#b23cfc',
              borderRadius: '50%'
            }}></div>
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0, letterSpacing: '0.1em' }}>iVASA</h1>
            <p style={{ fontSize: '0.875rem', color: '#c4b5fd', margin: 0 }}>Memory-Enhanced AI Interface</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '0.75rem',
              height: '0.75rem',
              borderRadius: '50%',
              background: getStatusColor()
            }}></div>
            <span style={{ fontSize: '0.875rem', color: '#c4b5fd' }}>{getStatusText()}</span>
          </div>
          
          <button
            onClick={() => setCurrentView('proof')}
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '0.5rem',
              color: 'white',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            🔧 Debug View
          </button>
        </div>
      </div>

      {/* Main Interface */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '600px', width: '100%' }}>
          
          {/* Memory Context Display */}
          {memoryContext?.success && memoryContext.context_summary && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: '1rem',
              padding: '1.5rem',
              marginBottom: '2rem',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem' }}>🧠 What I Remember About You</h3>
              <p style={{ 
                color: '#e9d5ff', 
                fontSize: '1rem', 
                lineHeight: '1.5',
                margin: 0,
                fontStyle: 'italic'
              }}>
                "{memoryContext.context_summary}"
              </p>
              <p style={{ 
                fontSize: '0.75rem', 
                color: '#c4b5fd', 
                marginTop: '0.5rem',
                margin: '0.5rem 0 0 0'
              }}>
                Based on {memoryContext.conversation_count} previous conversation(s)
              </p>
            </div>
          )}

          {/* ElevenLabs Voice Interface */}
          {!conversationActive ? (
            <div style={{ marginBottom: '2rem' }}>
              <button
                onClick={startVoiceConversation}
                style={{
                  width: '200px',
                  height: '200px',
                  borderRadius: '50%',
                  background: connectionStatus === 'ready' 
                    ? 'linear-gradient(45deg, #10B981, #34D399)' 
                    : 'linear-gradient(45deg, #F59E0B, #FCD34D)',
                  border: 'none',
                  color: 'white',
                  fontSize: '3rem',
                  cursor: 'pointer',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                  e.target.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
                }}
              >
                🎤
              </button>
            </div>
          ) : (
            <div style={{ marginBottom: '2rem' }}>
              {/* ElevenLabs Conversation Component */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '1rem',
                padding: '2rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                marginBottom: '1rem'
              }}>
                <Conversation
                  agentId="nJeN1YQZyK0aTu2SoJnM"
                  onConnect={() => {
                    console.log('🎤 ElevenLabs voice chat connected!');
                  }}
                  onDisconnect={() => {
                    console.log('🛑 ElevenLabs voice chat disconnected');
                    endConversation();
                  }}
                  onError={(error) => {
                    console.error('❌ ElevenLabs error:', error);
                    alert('Voice chat error: ' + error.message);
                  }}
                  onMessage={(message) => {
                    console.log('💬 Voice message:', message);
                  }}
                  style={{
                    width: '100%',
                    minHeight: '300px',
                    borderRadius: '0.5rem'
                  }}
                />
              </div>
              
              <button
                onClick={endConversation}
                style={{
                  padding: '0.75rem 2rem',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '2rem',
                  color: 'white',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
                onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
                onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
              >
                End Conversation
              </button>
            </div>
          )}

          {/* Status Text */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>
              {!conversationActive ? 'Ready to Talk with VASA' : 'Live Voice Conversation'}
            </h2>
            <p style={{ fontSize: '1rem', color: '#c4b5fd', margin: 0 }}>
              {!conversationActive 
                ? `Click the microphone to start voice conversation with memory-enhanced VASA (${getStatusText()})`
                : 'Memory system active - VASA has access to your conversation history'
              }
            </p>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={loadUserMemoryContext}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '0.5rem',
                color: 'white',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              🔄 Refresh Memory
            </button>
            
            <a
              href="https://app.mem0.ai/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '0.75rem 1.5rem',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '0.5rem',
                color: 'white',
                fontSize: '0.875rem',
                textDecoration: 'none',
                transition: 'all 0.3s',
                display: 'inline-block'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              🧠 Mem0 Dashboard
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        textAlign: 'center', 
        padding: '2rem',
        color: '#c4b5fd',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <p style={{ fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>
          AI-driven model to identify patterns that lead to self-affirming thoughts & behaviors
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', fontSize: '0.75rem', opacity: 0.7 }}>
          <span>Lost</span>
          <span>Heartache</span>
          <span>Lonely</span>
        </div>
      </div>
    </div>
  );

  // Debug Interface (same as before with force refresh)
  const ProofInterfaceView = () => {
    const [realMemories, setRealMemories] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      const loadData = async () => {
        try {
          const timestamp = Date.now();
          const response = await fetch(`/api/webhook?test=true&_t=${timestamp}`);
          const result = await response.json();
          setRealMemories(result);
          console.log('🔧 Debug data loaded:', result);
        } catch (error) {
          console.error('❌ Debug load failed:', error);
          setRealMemories({ error: error.message });
        }
        setLoading(false);
      };
      loadData();
    }, []);

    if (loading) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #b23cfc 0%, #8b5cf6 100%)',
          color: 'white',
          padding: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔄</div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Loading Debug Data...</h1>
          </div>
        </div>
      );
    }

    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #b23cfc 0%, #8b5cf6 100%)',
        color: 'white'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>🔧 Debug Interface</h1>
          <button
            onClick={() => setCurrentView('voice')}
            style={{
              padding: '0.5rem 1rem',
              background: '#8b5cf6',
              border: 'none',
              borderRadius: '0.5rem',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            ← Back to Voice
          </button>
        </div>

        <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '2rem' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '0.75rem',
            padding: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              🔧 System Status
            </h2>
            <p>Memory System: {realMemories?.mem0_working ? '✅ Mem0 Active' : '⚠️ OpenAI Fallback'}</p>
            <p>Service: {realMemories?.service_status?.service || 'Unknown'}</p>
            <p>Mode: {realMemories?.service_status?.mode || 'Unknown'}</p>
            <p>Status: {realMemories?.success ? '✅ All Tests Passed' : '❌ Tests Failed'}</p>
            <p>Last Checked: {new Date().toLocaleString()}</p>
            
            <div style={{ marginTop: '2rem' }}>
              <h3>Raw Test Results:</h3>
              <pre style={{
                background: 'rgba(0, 0, 0, 0.2)',
                padding: '1rem',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                overflow: 'auto',
                maxHeight: '400px'
              }}>
                {JSON.stringify(realMemories, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return currentView === 'voice' ? <VoiceInterfaceView /> : <ProofInterfaceView />;
};

// Main App Component
function App() {
  return <VASACompleteInterface />;
}

export default App;
