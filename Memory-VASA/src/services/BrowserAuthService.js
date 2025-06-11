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
    console.log('🔍 BrowserAuthService: Auth object assigned:', this.auth);
    console.log('🔍 BrowserAuthService: Initial current user:', this.auth.currentUser);
    
    // Expose for debugging
    window.browserAuthService = this;
  }

  async createUserWithEmail(email, password) {
    try {
      console.log('🔍 BrowserAuthService: createUserWithEmail called with email:', email);
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
    const isAuth = !!this.auth.currentUser;
    console.log('🔍 BrowserAuthService: isAuthenticated called, result:', isAuth);
    return isAuth;
  }

  getCurrentUser() {
    const user = this.auth.currentUser;
    console.log('🔍 BrowserAuthService: getCurrentUser called, result:', user ? user.uid : 'null');
    return user;
  }

  async getIdToken() {
    try {
      console.log('🔍 BrowserAuthService: getIdToken called');
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
      const user = this.auth.currentUser;
      console.log('🔍 BrowserAuthService: Current user for reload:', user ? user.uid : 'null');
      
      if (user) {
        await reload(user);
        console.log('🔍 BrowserAuthService: User reloaded, emailVerified:', user.emailVerified);
        return user.emailVerified;
      }
      return false;
    } catch (error) {
      console.error('🚨 BrowserAuthService: Error reloading user:', error);
      return false;
    }
  }

  onAuthStateChanged(callback) {
    console.log('🔍 BrowserAuthService: onAuthStateChanged listener attached');
    
    // Wrap the callback with debugging
    const wrappedCallback = (user) => {
      console.log('🔍 BrowserAuthService: Auth state changed event:', user ? `User ${user.uid}` : 'No user');
      if (user) {
        console.log('🔍 BrowserAuthService: User details:', {
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          isAnonymous: user.isAnonymous
        });
      }
      callback(user);
    };
    
    return onAuthStateChanged(this.auth, wrappedCallback);
  }
}

export default BrowserAuthService;
