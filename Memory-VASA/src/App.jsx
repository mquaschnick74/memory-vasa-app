import React, { useState, useEffect } from 'react';
import VASAInterface from './VoiceAgent';
import { useUserProfile } from './memory/BrowserMemoryHooks.js';

// Login Component for authentication (only)
function LoginComponent({ onUserAuthenticated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [symbolicName, setSymbolicName] = useState('');
  const [authStep, setAuthStep] = useState('login'); // 'login', 'register', 'verify_email'
  const [authService, setAuthService] = useState(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  // Initialize AuthService
  useEffect(() => {
    const initAuthService = async () => {
      try {
        const { default: BrowserAuthService } = await import('./services/BrowserAuthService.js');
        const auth = new BrowserAuthService();
        setAuthService(auth);

        // Listen for auth state changes
        auth.onAuthStateChanged(async (user) => {
          if (user) {
            localStorage.setItem('userUUID', user.uid);
            setIsEmailVerified(user.emailVerified);
            
            if (user.emailVerified) {
              console.log('✅ User authenticated:', user.uid);
              onUserAuthenticated(user.uid);
            } else {
              setAuthStep('verify_email');
            }
          } else {
            localStorage.removeItem('userUUID');
          }
        });
      } catch (error) {
        console.error('Failed to initialize AuthService:', error);
      }
    };

    initAuthService();
  }, [onUserAuthenticated]);

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
        console.log('✅ User signed in:', user.uid);
        // onUserAuthenticated will be called by the auth state listener
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
        console.log('✅ Email verified for:', currentUser.uid);
        // onUserAuthenticated will be called by the auth state listener
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
      setEmail('');
      setPassword('');
      setSymbolicName('');
      setIsEmailVerified(false);
      setAuthStep('login');
      localStorage.removeItem('userUUID');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <div style={{ 
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#b23cfc',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '40px'
    }}>
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: '40px',
        borderRadius: '20px',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center'
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
              Back to Sign In
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

        <style>{`
          @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>
      </div>
    </div>
  );
}

// Profile Guard Component
function ProfileGuard({ userUUID, children }) {
  const { 
    profile, 
    setupStatus, 
    loading, 
    error, 
    requiresProfile, 
    createProfile 
  } = useUserProfile(userUUID);

  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    display_name: '',
    therapeutic_goals: [],
    session_length: 'standard',
    intensity: 'moderate',
    communication_style: 'conversational'
  });
  const [creatingProfile, setCreatingProfile] = useState(false);

  // Check profile status and determine what to show
  useEffect(() => {
    if (!loading) {
      console.log('Profile check:', { requiresProfile, setupStatus });
      
      if (requiresProfile || !setupStatus?.profile_exists) {
        console.log('🚫 Profile required - blocking VASA access');
        setShowProfileForm(true);
      } else if (setupStatus?.profile_exists && setupStatus?.setup_completed) {
        console.log('✅ Profile exists and complete - allowing VASA access');
        setShowProfileForm(false);
      }
    }
  }, [loading, requiresProfile, setupStatus]);

  // Handle profile form submission
  async function handleProfileSubmit(e) {
    e.preventDefault();
    
    if (!profileFormData.display_name.trim()) {
      alert('Please enter your display name');
      return;
    }

    if (!profileFormData.therapeutic_goals.length) {
      alert('Please select at least one therapeutic goal');
      return;
    }

    try {
      setCreatingProfile(true);
      console.log('Creating therapeutic profile with data:', profileFormData);
      
      const result = await createProfile(profileFormData);
      
      if (result.success) {
        console.log('✅ Therapeutic profile created successfully');
        setShowProfileForm(false);
        // The useUserProfile hook will automatically reload and detect the new profile
      } else {
        console.error('Profile creation failed:', result.error);
        alert(result.error || 'Failed to create profile. Please try again.');
      }
    } catch (error) {
      console.error('Profile creation error:', error);
      alert('Profile creation failed. Please try again.');
    } finally {
      setCreatingProfile(false);
    }
  }

  // Show loading while checking profile
  if (loading) {
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
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid #ffffff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p>Checking your therapeutic profile...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Show error if profile check failed
  if (error) {
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
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>
            Unable to verify your therapeutic profile
          </p>
          <p style={{ fontSize: '1rem', marginBottom: '30px', opacity: 0.8 }}>
            {error}
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#ffffff',
              color: '#b23cfc',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show profile creation form if needed
  if (showProfileForm || requiresProfile) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#b23cfc',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '500px',
          width: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          padding: '40px',
          borderRadius: '20px',
          backdropFilter: 'blur(10px)'
        }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '10px'
          }}>
            Create Your Therapeutic Profile
          </h2>
          
          <p style={{
            textAlign: 'center',
            marginBottom: '30px',
            opacity: 0.9,
            fontSize: '1.1rem'
          }}>
            Welcome to Memory VASA! Let's set up your therapeutic profile to begin your Core Symbol Set journey.
          </p>
          
          <form onSubmit={handleProfileSubmit}>
            {/* Display Name */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: 'bold',
                marginBottom: '8px'
              }}>
                Display Name *
              </label>
              <input
                type="text"
                value={profileFormData.display_name}
                onChange={(e) => setProfileFormData(prev => ({ 
                  ...prev, 
                  display_name: e.target.value 
                }))}
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '1rem',
                  border: 'none',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: '#333'
                }}
                placeholder="How would you like to be addressed?"
                required
                disabled={creatingProfile}
              />
            </div>

            {/* Therapeutic Goals */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: 'bold',
                marginBottom: '8px'
              }}>
                Primary Therapeutic Goal *
              </label>
              <select
                value={profileFormData.therapeutic_goals[0] || ''}
                onChange={(e) => setProfileFormData(prev => ({
                  ...prev,
                  therapeutic_goals: e.target.value ? [e.target.value] : []
                }))}
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '1rem',
                  border: 'none',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: '#333'
                }}
                required
                disabled={creatingProfile}
              >
                <option value="">Select your primary goal</option>
                <option value="Emotional Regulation">Emotional Regulation</option>
                <option value="Relationship Improvement">Relationship Improvement</option>
                <option value="Trauma Recovery">Trauma Recovery</option>
                <option value="Self-Discovery">Self-Discovery</option>
                <option value="Anxiety Management">Anxiety Management</option>
                <option value="Personal Growth">Personal Growth</option>
                <option value="Communication Skills">Communication Skills</option>
                <option value="Identity Integration">Identity Integration</option>
              </select>
            </div>

            {/* Session Length */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: 'bold',
                marginBottom: '8px'
              }}>
                Preferred Session Length
              </label>
              <select
                value={profileFormData.session_length}
                onChange={(e) => setProfileFormData(prev => ({
                  ...prev,
                  session_length: e.target.value
                }))}
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '1rem',
                  border: 'none',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: '#333'
                }}
                disabled={creatingProfile}
              >
                <option value="short">Short (15-20 minutes)</option>
                <option value="standard">Standard (30-45 minutes)</option>
                <option value="extended">Extended (60+ minutes)</option>
              </select>
            </div>

            {/* Intensity */}
            <div style={{ marginBottom: '30px' }}>
              <label style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: 'bold',
                marginBottom: '8px'
              }}>
                Therapeutic Intensity
              </label>
              <select
                value={profileFormData.intensity}
                onChange={(e) => setProfileFormData(prev => ({
                  ...prev,
                  intensity: e.target.value
                }))}
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '1rem',
                  border: 'none',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: '#333'
                }}
                disabled={creatingProfile}
              >
                <option value="gentle">Gentle (Slow pace, comfort focus)</option>
                <option value="moderate">Moderate (Balanced approach)</option>
                <option value="intensive">Intensive (Deep work, faster pace)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={creatingProfile}
              style={{
                width: '100%',
                padding: '15px',
                backgroundColor: creatingProfile ? '#6b7280' : '#4CAF50',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: creatingProfile ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              {creatingProfile ? 'Creating Profile...' : 'Create Profile & Start Journey'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Profile exists and setup complete - show main app
  if (setupStatus?.profile_exists && setupStatus?.setup_completed) {
    return children;
  }

  // Fallback loading state
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
      <p>Setting up your therapeutic session...</p>
    </div>
  );
}

// User UUID Detector Component
function UserUUIDDetector({ children }) {
  const [userUUID, setUserUUID] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to get userUUID from various sources
    const detectUserUUID = () => {
      // Method 1: From localStorage (your current auth)
      const storedUUID = localStorage.getItem('userUUID');
      if (storedUUID) {
        console.log('Found userUUID in localStorage:', storedUUID);
        setUserUUID(storedUUID);
        setLoading(false);
        return;
      }

      // Method 2: Check if auth service has current user
      const checkAuthService = async () => {
        try {
          const { default: BrowserAuthService } = await import('./services/BrowserAuthService.js');
          const auth = new BrowserAuthService();
          const currentUser = auth.getCurrentUser();
          
          if (currentUser && currentUser.uid) {
            console.log('Found userUUID from auth service:', currentUser.uid);
            setUserUUID(currentUser.uid);
          } else {
            console.log('No authenticated user found');
            setUserUUID(null);
          }
        } catch (error) {
          console.error('Failed to check auth service:', error);
          setUserUUID(null);
        } finally {
          setLoading(false);
        }
      };

      checkAuthService();
    };

    detectUserUUID();

    // Listen for userUUID changes in localStorage
    const handleStorageChange = (e) => {
      if (e.key === 'userUUID') {
        setUserUUID(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleUserAuthenticated = (authenticatedUserUUID) => {
    console.log('🎉 User authenticated callback:', authenticatedUserUUID);
    setUserUUID(authenticatedUserUUID);
  };

  if (loading) {
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
        <p>Loading...</p>
      </div>
    );
  }

  // If no userUUID, show login component
  if (!userUUID) {
    return <LoginComponent onUserAuthenticated={handleUserAuthenticated} />;
  }

  // If userUUID exists, wrap with profile guard
  return (
    <ProfileGuard userUUID={userUUID}>
      {children}
    </ProfileGuard>
  );
}

// Main App Component
function App() {
  return (
    <UserUUIDDetector>
      <VASAInterface />
    </UserUUIDDetector>
  );
}

export default App;
