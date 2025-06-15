import React, { useState, useEffect } from 'react';

// Direct proof interface - no authentication required
const VASAProofInterface = () => {
  const [realMemories, setRealMemories] = useState(null);
  const [apiStatus, setApiStatus] = useState({});
  const [webhookStatus, setWebhookStatus] = useState(null);
  const [userMemories, setUserMemories] = useState(null);
  const [loading, setLoading] = useState(true);

  // Use your known working UUID directly
  const user = {
    uid: 'AVs5XlU6qQezh8GiNlRwN6UEfjM2',
    email: 'mquaschnick@icloud.com'
  };

  // Get REAL data on load
  useEffect(() => {
    loadRealData();
  }, []);

  const loadRealData = async () => {
    setLoading(true);
    await Promise.all([
      checkRealMemorySystem(),
      getRealUserMemories(),
      testRealWebhook()
    ]);
    setLoading(false);
  };

  // Test REAL memory system (not simulated)
  const checkRealMemorySystem = async () => {
    try {
      const response = await fetch('/api/webhook?test=true');
      const result = await response.json();
      setRealMemories(result);
      
      // Extract real API status
      setApiStatus({
        mem0_working: result.mem0_working,
        service: result.service_status?.service || 'unknown',
        mode: result.service_status?.mode || 'unknown',
        total_memories: result.results?.filter(r => r.message?.includes('Memory add result')).length || 0
      });
    } catch (error) {
      setApiStatus({ error: error.message });
    }
  };

  // Get REAL user conversation context (what VASA actually knows about you)
  const getRealUserMemories = async () => {
    try {
      const response = await fetch('/api/get-conversation-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.uid,
          limit: 10
        })
      });
      const result = await response.json();
      setUserMemories(result);
    } catch (error) {
      setUserMemories({ error: error.message });
    }
  };

  // Test REAL webhook (what happens when VASA connects)
  const testRealWebhook = async () => {
    try {
      const response = await fetch('/api/start-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUUID: user.uid,
          agentId: 'nJeN1YQZyK0aTu2SoJnM',
          conversationId: 'proof-test-' + Date.now()
        })
      });
      const result = await response.json();
      setWebhookStatus(result);
    } catch (error) {
      setWebhookStatus({ error: error.message });
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

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
          <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'pulse 2s infinite' }}>🧠</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Loading REAL VASA Data...</h1>
          <p style={{ color: '#c4b5fd' }}>Testing actual memory system, no simulations</p>
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
            width: '2rem',
            height: '2rem',
            background: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '1rem',
              height: '1rem',
              background: '#b23cfc',
              borderRadius: '50%'
            }}></div>
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>VASA PROOF INTERFACE</h1>
            <p style={{ fontSize: '0.75rem', color: '#c4b5fd', margin: 0 }}>Real functionality verification</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.875rem', color: '#c4b5fd' }}>User: {user.email}</span>
        </div>
      </div>

      <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '2rem' }}>
        {/* Real-time Status Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {/* Memory System Status */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '0.75rem',
            padding: '1.5rem'
          }}>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{
                width: '0.75rem',
                height: '0.75rem',
                borderRadius: '50%',
                marginRight: '0.5rem',
                background: apiStatus.mem0_working ? '#34d399' : '#fbbf24'
              }}></span>
              Memory System
            </h2>
            <div style={{ fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Status:</span>
                <span style={{ color: apiStatus.mem0_working ? '#86efac' : '#fde047' }}>
                  {apiStatus.mem0_working ? 'Mem0 Active' : 'Fallback Mode'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Service:</span>
                <span style={{ color: '#c4b5fd' }}>{apiStatus.service}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Mode:</span>
                <span style={{ color: '#c4b5fd' }}>{apiStatus.mode}</span>
              </div>
            </div>
          </div>

          {/* User Memory Context */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '0.75rem',
            padding: '1.5rem'
          }}>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{
                width: '0.75rem',
                height: '0.75rem',
                borderRadius: '50%',
                marginRight: '0.5rem',
                background: userMemories?.success ? '#34d399' : '#ef4444'
              }}></span>
              Your Memories
            </h2>
            <div style={{ fontSize: '0.875rem' }}>
              {userMemories?.success ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Total:</span>
                    <span style={{ color: '#86efac' }}>{userMemories.conversation_count || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Context:</span>
                    <span style={{ color: '#86efac' }}>Found</span>
                  </div>
                </>
              ) : (
                <div style={{ color: '#fca5a5' }}>No memories found</div>
              )}
            </div>
          </div>

          {/* Webhook Status */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '0.75rem',
            padding: '1.5rem'
          }}>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{
                width: '0.75rem',
                height: '0.75rem',
                borderRadius: '50%',
                marginRight: '0.5rem',
                background: webhookStatus?.success ? '#34d399' : '#ef4444'
              }}></span>
              Webhook
            </h2>
            <div style={{ fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Status:</span>
                <span style={{ color: webhookStatus?.success ? '#86efac' : '#fca5a5' }}>
                  {webhookStatus?.success ? 'Working' : 'Error'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Connection:</span>
                <span style={{ color: '#c4b5fd' }}>
                  {webhookStatus?.success ? 'Ready' : 'Failed'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Real Memory Data Display */}
        {userMemories?.success && userMemories.context_summary && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              🧠 REAL Memory Context (What VASA Knows About You)
            </h2>
            <div style={{
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '0.5rem',
              padding: '1rem'
            }}>
              <p style={{ color: '#86efac', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>
                ✅ REAL DATA FROM MEM0:
              </p>
              <p style={{ color: 'white', margin: '0 0 0.5rem 0' }}>
                {userMemories.context_summary}
              </p>
              {userMemories.conversation_count > 0 && (
                <p style={{ color: '#c4b5fd', fontSize: '0.875rem', margin: 0 }}>
                  Based on {userMemories.conversation_count} stored conversation(s)
                </p>
              )}
            </div>
          </div>
        )}

        {/* Raw API Test Results */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* Memory System Test Results */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '0.75rem',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>Memory System Test Results</h3>
            <div style={{
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '0.5rem',
              padding: '1rem',
              maxHeight: '24rem',
              overflow: 'auto'
            }}>
              <pre style={{ fontSize: '0.75rem', color: '#c4b5fd', whiteSpace: 'pre-wrap', margin: 0 }}>
                {JSON.stringify(realMemories, null, 2)}
              </pre>
            </div>
          </div>

          {/* User Context Results */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '0.75rem',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem' }}>User Memory Context</h3>
            <div style={{
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '0.5rem',
              padding: '1rem',
              maxHeight: '24rem',
              overflow: 'auto'
            }}>
              <pre style={{ fontSize: '0.75rem', color: '#c4b5fd', whiteSpace: 'pre-wrap', margin: 0 }}>
                {JSON.stringify(userMemories, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '2rem' }}>
          <button
            onClick={loadRealData}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#8b5cf6',
              border: 'none',
              borderRadius: '0.5rem',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => e.target.style.background = '#7c3aed'}
            onMouseOut={(e) => e.target.style.background = '#8b5cf6'}
          >
            🔄 Refresh Real Data
          </button>
          
          <a
            href="/api/webhook?test=true"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '0.75rem 1.5rem',
              background: '#7c3aed',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '0.5rem',
              fontWeight: 'bold',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => e.target.style.background = '#6d28d9'}
            onMouseOut={(e) => e.target.style.background = '#7c3aed'}
          >
            🧪 Direct API Test
          </a>
          
          <a
            href="https://app.mem0.ai/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '0.75rem 1.5rem',
              background: '#6d28d9',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '0.5rem',
              fontWeight: 'bold',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => e.target.style.background = '#5b21b6'}
            onMouseOut={(e) => e.target.style.background = '#6d28d9'}
          >
            📊 Mem0 Dashboard
          </a>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '3rem', textAlign: 'center', color: '#c4b5fd' }}>
          <p style={{ fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>
            🎯 <strong>PROOF INTERFACE</strong> - Showing real VASA functionality, no simulations
          </p>
          <p style={{ fontSize: '0.75rem', opacity: 0.7, margin: 0 }}>
            User ID: {user.uid} | Last Updated: {formatTimestamp(Date.now())}
          </p>
        </div>
      </div>
    </div>
  );
};

// Main App Component - Direct to proof interface (no auth)
function App() {
  return <VASAProofInterface />;
}

export default App;
