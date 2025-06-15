// src/services/BrowserAuthService.js
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  reload,
  signInAnonymously
} from 'firebase/auth';
import { auth } from '../firebase-config.js';

class BrowserAuthService {
  constructor() {
    console.log('🔍 BrowserAuthService: Constructor called');
    this.auth = auth;
    this._authStateListeners = new Set();
    this._isInitialized = false;
    console.log('🔍 BrowserAuthService: Auth object assigned:', this.auth);
    console.log('🔍 BrowserAuthService: Initial current user:', this.auth.currentUser);
    
    // Set up the main auth state listener once
    this._setupAuthStateListener();
    
    // Expose for debugging
    if (typeof window !== 'undefined') {
      window.browserAuthService = this;
    }
  }

  _setupAuthStateListener() {
    console.log('🔍 BrowserAuthService: Setting up main auth state listener');
    try {
      onAuthStateChanged(this.auth, (user) => {
        console.log('🔍 BrowserAuthService: Firebase auth state changed:', user ? `User ${user.uid}` : 'No user');
        if (user) {
          console.log('🔍 BrowserAuthService: User details:', {
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified,
            isAnonymous: user.isAnonymous
          });
        }
        
        // Notify all registered listeners
        this._authStateListeners.forEach(callback => {
          try {
            callback(user);
          } catch (error) {
            console.error('🚨 Error in auth state listener:', error);
          }
        });
        
        this._isInitialized = true;
      });
    } catch (error) {
      console.error('🚨 Error setting up auth state listener:', error);
    }
  }

  async createUserWithEmail(email, password) {
    try {
      console.log('🔍 BrowserAuthService: createUserWithEmail called with email:', email);
      if (!this.auth) {
        throw new Error('Auth not initialized');
      }
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      console.log('🔍 BrowserAuthService: User created successfully:', userCredential.user.uid);
      return userCredential.user;
    } catch (error) {
      console.error('🚨 BrowserAuthService: Error creating user:', error);
      throw error;
    }
  }

  async signInWithEmail(email, password) {
    try {
      console.log('🔍 BrowserAuthService: signInWithEmail called with email:', email);
      if (!this.auth) {
        throw new Error('Auth not initialized');
      }
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      console.log('🔍 BrowserAuthService: User signed in successfully:', userCredential.user.uid);
      return userCredential.user;
    } catch (error) {
      console.error('🚨 BrowserAuthService: Error signing in:', error);
      throw error;
    }
  }

  async signInAnonymously() {
    try {
      console.log('🔍 BrowserAuthService: signInAnonymously called');
      if (!this.auth) {
        throw new Error('Auth not initialized');
      }
      const userCredential = await signInAnonymously(this.auth);
      console.log('🔍 BrowserAuthService: Anonymous sign-in successful:', userCredential.user.uid);
      return userCredential.user;
    } catch (error) {
      console.error('🚨 BrowserAuthService: Error with anonymous sign-in:', error);
      throw error;
    }
  }

  async sendEmailVerification() {
    try {
      console.log('🔍 BrowserAuthService: sendEmailVerification called');
      if (!this.auth) {
        throw new Error('Auth not initialized');
      }
      const user = this.auth.currentUser;
      console.log('🔍 BrowserAuthService: Current user for verification:', user ? user.uid : 'null');
      
      if (user) {
        await sendEmailVerification(user);
        console.log('🔍 BrowserAuthService: Email verification sent');
        return true;
      }
      throw new Error('No user logged in');
    } catch (error) {
      console.error('🚨 BrowserAuthService: Error sending verification email:', error);
      throw error;
    }
  }

  async signOut() {
    try {
      console.log('🔍 BrowserAuthService: signOut called');
      if (!this.auth) {
        throw new Error('Auth not initialized');
      }
      const currentUser = this.auth.currentUser;
      console.log('🔍 BrowserAuthService: Signing out user:', currentUser ? currentUser.uid : 'null');
      
      await signOut(this.auth);
      console.log('🔍 BrowserAuthService: Sign out successful');
      return true;
    } catch (error) {
      console.error('🚨 BrowserAuthService: Error signing out:', error);
      throw error;
    }
  }

  isAuthenticated() {
    try {
      if (!this.auth) {
        console.log('🔍 BrowserAuthService: Auth not initialized, returning false');
        return false;
      }
      const isAuth = !!this.auth.currentUser;
      console.log('🔍 BrowserAuthService: isAuthenticated called, result:', isAuth);
      return isAuth;
    } catch (error) {
      console.error('🚨 BrowserAuthService: Error in isAuthenticated:', error);
      return false;
    }
  }

  getCurrentUser() {
    try {
      if (!this.auth) {
        console.log('🔍 BrowserAuthService: Auth not initialized, returning null');
        return null;
      }
      const user = this.auth.currentUser;
      console.log('🔍 BrowserAuthService: getCurrentUser called, result:', user ? user.uid : 'null');
      return user;
    } catch (error) {
      console.error('🚨 BrowserAuthService: Error in getCurrentUser:', error);
      return null;
    }
  }

  async getIdToken() {
    try {
      console.log('🔍 BrowserAuthService: getIdToken called');
      if (!this.auth) {
        throw new Error('Auth not initialized');
      }
      const user = this.auth.currentUser;
      console.log('🔍 BrowserAuthService: Current user for token:', user ? user.uid : 'null');
      
      if (user) {
        const token = await user.getIdToken();
        console.log('🔍 BrowserAuthService: ID token obtained (length):', token.length);
        return token;
      }
      throw new Error('No user logged in');
    } catch (error) {
      console.error('🚨 BrowserAuthService: Error getting ID token:', error);
      throw error;
    }
  }

  async reloadUser() {
    try {
      console.log('🔍 BrowserAuthService: reloadUser called');
      if (!this.auth) {
        throw new Error('Auth not initialized');
      }
      const user = this.auth.currentUser;
      console.log('🔍 BrowserAuthService: Current user for reload:', user ? user.uid : 'null');
      
      if (user) {
        await reload(user);
        console.log('🔍 BrowserAuthService: User reloaded, emailVerified:', user.emailVerified);
        
        // Manually trigger auth state listeners to ensure UI updates
        console.log('🔍 BrowserAuthService: Triggering auth state update after reload');
        this._authStateListeners.forEach(callback => {
          try {
            callback(user);
          } catch (error) {
            console.error('🚨 Error in manual auth state trigger:', error);
          }
        });
        
        return user.emailVerified;
      }
      return false;
    } catch (error) {
      console.error('🚨 BrowserAuthService: Error reloading user:', error);
      return false;
    }
  }

  // Register auth state listeners
  onAuthStateChanged(callback) {
    console.log('🔍 BrowserAuthService: Adding auth state listener');
    this._authStateListeners.add(callback);
    
    // Immediately call with current user state if initialized
    if (this._isInitialized) {
      const currentUser = this.getCurrentUser();
      console.log('🔍 BrowserAuthService: Immediately calling new listener with current user:', currentUser ? currentUser.uid : 'null');
      try {
        callback(currentUser);
      } catch (error) {
        console.error('🚨 Error in immediate callback:', error);
      }
    }
    
    // Return unsubscribe function
    return () => {
      console.log('🔍 BrowserAuthService: Removing auth state listener');
      this._authStateListeners.delete(callback);
    };
  }

  // Force refresh auth state
  async forceAuthStateRefresh() {
    console.log('🔍 BrowserAuthService: Forcing auth state refresh');
    try {
      const currentUser = this.getCurrentUser();
      
      if (currentUser) {
        await this.reloadUser();
      }
      
      // Trigger all listeners with current state
      this._authStateListeners.forEach(callback => {
        try {
          callback(currentUser);
        } catch (error) {
          console.error('🚨 Error in forced auth state refresh:', error);
        }
      });
    } catch (error) {
      console.error('🚨 Error in forceAuthStateRefresh:', error);
    }
  }
}

// Create and export singleton instance
let instance = null;

export const getBrowserAuthService = () => {
  if (!instance) {
    console.log('🔍 Creating new BrowserAuthService singleton instance');
    instance = new BrowserAuthService();
  }
  return instance;
};

// Export the class itself for debugging
export { BrowserAuthService };

// Export singleton instance as default
const authService = getBrowserAuthService();
export default authService;
