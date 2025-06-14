import React, { useState, useEffect } from 'react';
import VASAInterface from './VASAInterface'; // Your main VASA interface component
import { getBrowserAuthService } from './services/BrowserAuthService.js';

// Login Component
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
        // Login
        const result = await authService.signInWithEmail(email, password);
        console.log('✅ Login successful:', result);
        onLoginSuccess(result.user);
      } else {
        // Registration
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
          🧠 VASA Memory
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

        <p style={{
          textAlign: 'center',
          marginTop: '20px',
          color: '#6b7280',
          fontSize: '14px'
        }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            style={{
              color: '#b23cfc',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isLogin ? 'Register here' : 'Login here'}
          </button>
        </p>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userUUID, setUserUUID] = useState(null);

  // Check authentication status on app load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        console.log('🔍 Checking authentication status...');
        const authService = getBrowserAuthService();
        
        // Check if user is already logged in
        const currentUser = await authService.getCurrentUser();
        
        if (currentUser) {
          console.log('✅ User already authenticated:', currentUser);
          setUser(currentUser);
          
          // Set userUUID for the session
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
    
    // Set userUUID for the session
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
      
      // Clear user state and localStorage
      setUser(null);
      setUserUUID(null);
      localStorage.removeItem('userUUID');
      localStorage.removeItem('terms_accepted');
      localStorage.removeItem('currentStage');
      localStorage.removeItem('stageHistory');
      
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  // Show loading screen while checking auth
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
          <p>Loading VASA Memory Interface...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <LoginInterface onLoginSuccess={handleLoginSuccess} />;
  }

  // Show main VASA interface if authenticated
  return <VASAInterface user={user} onLogout={handleLogout} />;
}

export default App;
