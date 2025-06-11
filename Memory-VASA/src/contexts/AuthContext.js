// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import browserAuthService from '../services/BrowserAuthService.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userUUID, setUserUUID] = useState(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Debug component state
  const DebugAuthState = () => {
    if (process.env.NODE_ENV !== 'development') return null;
    
    return (
      <div style={{ 
        position: 'fixed', 
        top: 10, 
        right: 10, 
        background: 'rgba(0,0,0,0.8)', 
        color: 'white', 
        padding: '10px',
        fontSize: '12px',
        zIndex: 9999,
        borderRadius: '4px'
      }}>
        <div>User ID: {userUUID || 'null'}</div>
        <div>Email Verified: {emailVerified ? '✅' : '❌'}</div>
        <div>Loading: {loading ? '⏳' : '✅'}</div>
        <div>Initialized: {authInitialized ? '✅' : '❌'}</div>
      </div>
    );
  };

  useEffect(() => {
    console.log('🔍 AuthProvider: Setting up auth listener');
    
    // Set up auth state listener
    const unsubscribe = browserAuthService.onAuthStateChanged((firebaseUser) => {
      console.log('🔍 AuthProvider: Auth state changed:', firebaseUser ? firebaseUser.uid : 'No user');
      
      if (firebaseUser) {
        console.log('🔍 AuthProvider: User authenticated:', {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          emailVerified: firebaseUser.emailVerified
        });
        
        setUser(firebaseUser);
        setUserUUID(firebaseUser.uid);
        setEmailVerified(firebaseUser.emailVerified);
        
        // Store in localStorage
        localStorage.setItem('userUUID', firebaseUser.uid);
        console.log('🔍 AuthProvider: Stored userUUID in localStorage:', firebaseUser.uid);
        
        if (firebaseUser.emailVerified) {
          console.log('✅ AuthProvider: Email is verified, user ready');
        } else {
          console.log('⚠️ AuthProvider: Email not verified yet');
        }
      } else {
        console.log('🔍 AuthProvider: User signed out');
        setUser(null);
        setUserUUID(null);
        setEmailVerified(false);
        
        // Remove from localStorage
        localStorage.removeItem('userUUID');
        console.log('🔍 AuthProvider: Removed userUUID from localStorage');
      }
      
      setLoading(false);
      setAuthInitialized(true);
    });

    // Check for existing user in localStorage on app start
    const storedUserUUID = localStorage.getItem('userUUID');
    if (storedUserUUID) {
      console.log('🔍 AuthProvider: Found stored userUUID:', storedUserUUID);
    }

    return () => {
      console.log('🔍 AuthProvider: Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  // Function to force refresh auth state (useful after email verification)
  const refreshAuthState = async () => {
    console.log('🔍 AuthProvider: Manually refreshing auth state');
    setLoading(true);
    
    try {
      await browserAuthService.forceAuthStateRefresh();
      console.log('🔍 AuthProvider: Auth state refresh completed');
    } catch (error) {
      console.error('🚨 AuthProvider: Error refreshing auth state:', error);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced email verification check with automatic UI updates
  const checkEmailVerification = async () => {
    console.log('🔍 AuthProvider: Checking email verification status');
    
    if (!user) {
      console.log('🔍 AuthProvider: No user to check verification for');
      return false;
    }

    try {
      const isVerified = await browserAuthService.reloadUser();
      console.log('🔍 AuthProvider: Email verification check result:', isVerified);
      
      if (isVerified !== emailVerified) {
        console.log('🔍 AuthProvider: Email verification status changed:', isVerified);
        setEmailVerified(isVerified);
      }
      
      return isVerified;
    } catch (error) {
      console.error('🚨 AuthProvider: Error checking email verification:', error);
      return false;
    }
  };

  const contextValue = {
    // State
    user,
    userUUID,
    emailVerified,
    loading,
    authInitialized,
    
    // Auth service methods
    authService: browserAuthService,
    
    // Helper methods
    refreshAuthState,
    checkEmailVerification,
    
    // Computed values
    isAuthenticated: !!user,
    isVerifiedUser: !!user && emailVerified,
    needsVerification: !!user && !emailVerified
  };

  console.log('🔍 AuthProvider: Rendering with state:', {
    hasUser: !!user,
    userUUID,
    emailVerified,
    loading,
    authInitialized
  });

  return (
    <AuthContext.Provider value={contextValue}>
      {process.env.NODE_ENV === 'development' && <DebugAuthState />}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
