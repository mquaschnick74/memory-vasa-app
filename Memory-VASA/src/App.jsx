import React, { useState, useEffect } from 'react';
import VASAInterface from './VASAInterface'; // FIXED: Changed from './VoiceAgent'
import { AppWithProfileGuard } from './guards/AuthProfileGuard.js'; // Import your existing AuthProfileGuard
import { getBrowserAuthService } from './services/BrowserAuthService.js'; // Use singleton

// Login Component for authentication (only) - SAME AS BEFORE
function LoginComponent({ onUserAuthenticated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [symbolicName, setSymbolicName] = useState('');
  const [authStep, setAuthStep] = useState('login'); // 'login', 'register', 'verify_email'
  const [authService, setAuthService] = useState(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);

  // Initialize AuthService using singleton
  useEffect(() => {
    const initAuthService = async () => {
      try {
        console.log('🔍 LoginComponent: Initializing AuthService...');
        // FIXED: Use singleton instead of creating new instance
        const auth = getBrowserAuthService();
        setAuthService(auth);

        // 🔍 DEBUGGING: Expose auth globally and add detailed logging
        window.debugAuth = auth;
        console.log('🔍 Auth service initialized:', auth);
        console.log('🔍 Current user on init:', auth.getCurrentUser());

        // Test Firebase connection
        const testFirebaseConnection = async () => {
          try {
            console.log('🔍 Testing Firebase connection...');
            
            // Import Firebase directly to test
            const { auth: firebaseAuth } = await import('./firebase-config.js');
            console.log('🔍 Firebase auth object:', firebaseAuth);
            console.log('🔍 Firebase current user:', firebaseAuth.currentUser);
            
            // Test a simple Firebase operation
            const { onAuthStateChanged } = await import('firebase/auth');
            onAuthStateChanged(firebaseAuth, (user) => {
              console.log('🔍 Firebase direct auth state:', user ? 'Signed in' : 'Signed out');
              if (user) {
                console.log('🔍 Firebase direct user details:', {
                  uid: user.uid,
                  email: user.email,
                  emailVerified: user.emailVerified
                });
              }
            });
            
          } catch (error) {
            console.error('🚨 Firebase connection test failed:', error);
          }
        };

        testFirebaseConnection();

        // Listen for auth state changes with detailed logging
        auth.onAuthStateChanged(async (user) => {
          console.log('🔍 BrowserAuthService auth state changed event fired');
          console.log('🔍 User object from BrowserAuthService:', user);
          
          if (user) {
            console.log('🔍 User authenticated via BrowserAuthService:', {
              uid: user.uid,
              email: user.email,
              emailVerified: user.emailVerified,
              metadata: user.metadata
            });
            
            localStorage.setItem('userUUID', user.uid);
            console.log('🔍 Stored userUUID in localStorage:', user.uid);
            setIsEmailVerified(user.emailVerified);
            
            if (user.emailVerified) {
              console.log('✅ User authenticated and verified, calling onUserAuthenticated:', user.uid);
              onUserAuthenticated(user.uid);
            } else {
              console.log('⚠️ User authenticated but email not verified');
              setAuthStep('verify_email');
            }
          } else {
            console.log('🔍 User signed out via BrowserAuthService');
            localStorage.removeItem('userUUID');
            console.log('🔍 Removed userUUID from localStorage');
            setIsEmailVerified(false);
            setAuthStep('login');
          }
        });
      } catch (error) {
        console.error('🚨 Failed to initialize AuthService:', error);
      }
    };

    initAuthService();
  }, [onUserAuthenticated]);

  // Automatic verification checking
  useEffect(() => {
    if (authStep === 'verify_email' && authService && !checkingVerification) {
      console.log('🔍 LoginComponent: Starting periodic verification check');
      
      const checkInterval = setInterval(async () => {
        console.log('🔍 LoginComponent: Auto-checking verification status...');
        setCheckingVerification(true);
        
        try {
          const isVerified = await authService.reloadUser();
          console.log('🔍 LoginComponent: Auto-check result:', isVerified);
          
          if (isVerified) {
            console.log('✅ LoginComponent: Email verified during auto-check!');
            clearInterval(checkInterval);
            setCheckingVerification(false);
            // Auth state listener will handle the transition
          }
        } catch (error) {
          console.error('🚨 LoginComponent: Auto-check error:', error);
        } finally {
          setCheckingVerification(false);
        }
      }, 3000); // Check every 3 seconds

      // Stop checking after 10 minutes
      const stopTimeout = setTimeout(() => {
        console.log('🔍 LoginComponent: Stopping auto-check after timeout');
        clearInterval(checkInterval);
        setCheckingVerification(false);
      }, 600000); // 10 minutes

      return () => {
        clearInterval(checkInterval);
        clearTimeout(stopTimeout);
        setCheckingVerification(false);
      };
    }
  }, [authStep, authService, checkingVerification]);

  // Handle user registration with email
  const handleRegister = async () => {
    console.log('🔍 handleRegister called');
    if (!email.trim() || !password.trim() || !symbolicName.trim()) {
      alert('Please fill in all fields');
      return;
    }

    if (!authService) {
      alert('Authentication service not ready');
      return;
    }

    try {
      console.log('🔍 Attempting to create user with email:', email);
      const user = await authService.createUserWithEmail(email, password);
      console.log('🔍 User created successfully:', user.uid);
      
      // Send email verification
      console.log('🔍 Sending email verification...');
      await authService.sendEmailVerification();
      console.log('🔍 Email verification sent');
      
      setAuthStep('verify_email');
      alert('Account created! Please check your email and click the verification link.');
    } catch (error) {
      console.error('🚨 Registration failed:', error);
      alert('Registration failed: ' + error.message);
    }
  };

  // Handle user login with email
  const handleLogin = async () => {
    console.log('🔍 handleLogin called');
    if (!email.trim() || !password.trim()) {
      alert('Please enter email and password');
      return;
    }

    if (!authService) {
      alert('Authentication service not ready');
      return;
    }

    try {
      console.log('🔍 Attempting to sign in with email:', email);
      const user = await authService.signInWithEmail(email, password);
      console.log('🔍 Sign in successful:', user.uid, 'emailVerified:', user.emailVerified);
      
      if (user.emailVerified) {
        console.log('✅ User signed in with verified email:', user.uid);
        // onUserAuthenticated will be called by the auth state listener
      } else {
        console.log('⚠️ User signed in but email not verified');
        setAuthStep('verify_email');
        alert('Please verify your email before continuing');
      }
    } catch (error) {
      console.error('🚨 Login failed:', error);
      alert('Login failed: ' + error.message);
    }
  };

  // Check email verification status
  const checkEmailVerification = async () => {
    console.log('🔍 checkEmailVerification called');
    if (!authService) return;

    setCheckingVerification(true);
    try {
      console.log('🔍 Reloading user to check verification status...');
      const isVerified = await authService.reloadUser();
      console.log('🔍 Email verification status:', isVerified);
      
      if (isVerified) {
        const currentUser = authService.getCurrentUser();
        setIsEmailVerified(true);
        console.log('✅ Email verified for:', currentUser.uid);
        // Auth state listener will handle the transition automatically
        alert('Email verified successfully! Welcome to VASA.');
      } else {
        alert('Email not yet verified. Please check your email.');
      }
    } catch (error) {
      console.error('🚨 Verification check failed:', error);
      alert('Failed to check verification status');
    } finally {
      setCheckingVerification(false);
    }
  };

  // Resend verification email
  const resendVerificationEmail = async () => {
    console.log('🔍 resendVerificationEmail called');
    if (!authService) return;

    try {
      await authService.sendEmailVerification();
      console.log('🔍 Verification email resent');
      alert('Verification email sent! Please check your inbox.');
    } catch (error) {
      console.error('🚨 Failed to resend verification:', error);
      alert('Failed to send verification email');
    }
  };

  // Sign out
  const handleSignOut = async () => {
    console.log('🔍 handleSignOut called');
    if (!authService) return;

    try {
      await authService.signOut();
      console.log('🔍 Sign out successful');
      setEmail('');
      setPassword('');
      setSymbolicName('');
      setIsEmailVerified(false);
      setAuthStep('login');
      localStorage.removeItem('userUUID');
      console.log('🔍 Cleared form and localStorage');
    } catch (error) {
      console.error('🚨 Sign out failed:', error);
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
            
            {checkingVerification && (
              <p style={{ color: '#4CAF50', marginBottom: '20px' }}>
                🔄 Checking verification status...
              </p>
            )}
            
            <button
              onClick={checkEmailVerification}
              disabled={checkingVerification}
              style={{
                padding: '15px 30px',
                fontSize: '1.1rem',
                backgroundColor: checkingVerification ? '#6b7280' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: checkingVerification ? 'not-allowed' : 'pointer',
                width: '100%',
                fontWeight: 'bold',
                marginBottom: '15px',
                opacity: checkingVerification ? 0.6 : 1
              }}
            >
              {checkingVerification ? 'Checking...' : "I've Verified My Email"}
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

// SIMPLIFIED User UUID Detector Component - using your AuthProfileGuard
function UserUUIDDetector({ children }) {
  const [userUUID, setUserUUID] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔍 UserUUIDDetector: Starting user detection...');
    
    // Try to get userUUID from various sources
    const detectUserUUID = () => {
      // Method 1: From localStorage (your current auth)
      const storedUUID = localStorage.getItem('userUUID');
      if (storedUUID) {
        console.log('🔍 Found userUUID in localStorage:', storedUUID);
        setUserUUID(storedUUID);
        setLoading(false);
        return;
      }

      // Method 2: Check if auth service has current user - FIXED to use singleton
      const checkAuthService = async () => {
        try {
          console.log('🔍 Checking auth service for current user...');
          // FIXED: Use singleton instead of creating new instance
          const auth = getBrowserAuthService();
          const currentUser = auth.getCurrentUser();
          
          if (currentUser && currentUser.uid) {
            console.log('🔍 Found userUUID from auth service:', currentUser.uid);
            setUserUUID(currentUser.uid);
            localStorage.setItem('userUUID', currentUser.uid);
          } else {
            console.log('🔍 No authenticated user found in auth service');
            setUserUUID(null);
          }
        } catch (error) {
          console.error('🚨 Failed to check auth service:', error);
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
        console.log('🔍 UserUUID changed in localStorage:', e.newValue);
        setUserUUID(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleUserAuthenticated = (authenticatedUserUUID) => {
    console.log('🎉 UserUUIDDetector: User authenticated callback:', authenticatedUserUUID);
    setUserUUID(authenticatedUserUUID);
  };

  if (loading) {
    console.log('🔍 UserUUIDDetector showing loading state');
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
    console.log('🔍 UserUUIDDetector: No userUUID, showing LoginComponent');
    return <LoginComponent onUserAuthenticated={handleUserAuthenticated} />;
  }

  // UPDATED: Use your AuthProfileGuard instead of embedded ProfileGuard
  console.log('🔍 UserUUIDDetector: UserUUID exists, using AppWithProfileGuard:', userUUID);
  return (
    <AppWithProfileGuard userUUID={userUUID}>
      {children}
    </AppWithProfileGuard>
  );
}

// Main App Component
function App() {
  console.log('🔍 App component rendered');
  return (
    <UserUUIDDetector>
      <VASAInterface />
    </UserUUIDDetector>
  );
}

export default App;
