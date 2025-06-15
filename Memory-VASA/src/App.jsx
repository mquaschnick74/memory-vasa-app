import React, { useState, useEffect } from 'react';
import { getBrowserAuthService } from './services/BrowserAuthService.js';

// Import the proof interface instead of VASAInterface
const VASAProofInterface = ({ user, onLogout }) => {
  const [realMemories, setRealMemories] = useState(null);
  const [apiStatus, setApiStatus] = useState({});
  const [webhookStatus, setWebhookStatus] = useState(null);
  const [userMemories, setUserMemories] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get REAL data on load
  useEffect(() => {
    loadRealData();
  }, [user]);

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
          <button
            onClick={onLogout}
            style={{
              padding: '0.5rem 1rem',
              background: '#8b5cf6',
              border: 'none',
              borderRadius: '0.5rem',
              color: 'white',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => e.target.style.background = '#7c3aed'}
            onMouseOut={(e) => e.target.style.background = '#8b5cf6'}
          >
            Logout
          </button>
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

// Login Component (keeping your existing beautiful auth)
const LoginInterface = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const authService = getBrowserAuthService();
      
      if (isLogin) {
        const result = await authService.signInWithEmail(email, password);
        console.log('✅ Login successful:', result);
        onLoginSuccess(result.user);
      } else {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        
        const result = await authService.createUser(email, password);
        console.log('✅ Registration successful:', result);
        onLoginSuccess(result.user);
      }
    } catch (error) {
      console.error('❌ Auth error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #b23cfc 0%, #8b5cf6 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{
          textAlign: 'center',
          color: '#b23cfc',
          marginBottom: '30px',
          fontSize: '2rem'
        }}>
          🧠 VASA PROOF
        </h1>

        <div style={{
          display: 'flex',
          marginBottom: '30px',
          background: '#f3f4f6',
          borderRadius: '10px',
          padding: '5px'
        }}>
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '8px',
              background: isLogin ? '#b23cfc' : 'transparent',
              color: isLogin ? 'white' : '#6b7280',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '8px',
              background: !isLogin ? '#b23cfc' : 'transparent',
              color: !isLogin ? 'white' : '#6b7280',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '15px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#b23cfc'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '15px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = '#b23cfc'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {!isLogin && (
            <div style={{ marginBottom: '20px' }}>
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '15px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.3s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#b23cfc'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          )}

          {error && (
            <div style={{
              background: '#fee2e2',
              color: '#dc2626',
              padding: '10px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px',
              background: loading ? '#9ca3af' : '#b23cfc',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s ease',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? (
              <span>
                {isLogin ? 'Signing In...' : 'Creating Account...'}
              </span>
            ) : (
              <span>
                {isLogin ? 'Sign In' : 'Create Account'}
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

// Main App Component (keeping your existing auth logic)
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userUUID, setUserUUID] = useState(null);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        console.log('🔍 Checking authentication status...');
        const authService = getBrowserAuthService();
        
        const currentUser = await authService.getCurrentUser();
        
        if (currentUser) {
          console.log('✅ User already authenticated:', currentUser);
          setUser(currentUser);
          
          const uuid = currentUser.uid;
          setUserUUID(uuid);
          localStorage.setItem('userUUID', uuid);
          
          console.log('🆔 User UUID set:', uuid);
        } else {
          console.log('ℹ️ No authenticated user found');
        }
      } catch (error) {
        console.error('❌ Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const handleLoginSuccess = (authenticatedUser) => {
    console.log('🎉 Login success, setting user:', authenticatedUser);
    setUser(authenticatedUser);
    
    const uuid = authenticatedUser.uid;
    setUserUUID(uuid);
    localStorage.setItem('userUUID', uuid);
    
    console.log('🆔 User UUID set after login:', uuid);
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Logging out...');
      const authService = getBrowserAuthService();
      await authService.signOut();
      
      setUser(null);
      setUserUUID(null);
      localStorage.removeItem('userUUID');
      
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #b23cfc 0%, #8b5cf6 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '1.2rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '3rem', 
            marginBottom: '20px',
            animation: 'pulse 2s infinite'
          }}>
            🧠
          </div>
          <p>Loading VASA Proof Interface...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginInterface onLoginSuccess={handleLoginSuccess} />;
  }

  // Show proof interface instead of VASAInterface
  return <VASAProofInterface user={user} onLogout={handleLogout} />;
}

export default App;
