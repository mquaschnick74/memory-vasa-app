import React, { useState, useEffect } from 'react';

// Simple Login Component (no profile creation - just authentication)
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

export default LoginComponent;
