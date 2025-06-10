// src/services/BrowserAuthService.js
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  reload
} from 'firebase/auth';
import { auth } from '../../lib/firebase.js';

class BrowserAuthService {
  constructor() {
    this.auth = auth;
  }

  async createUserWithEmail(email, password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async signInWithEmail(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  async sendEmailVerification() {
    try {
      const user = this.auth.currentUser;
      if (user) {
        await sendEmailVerification(user);
        return true;
      }
      throw new Error('No user logged in');
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw error;
    }
  }

  async signOut() {
    try {
      await signOut(this.auth);
      return true;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  isAuthenticated() {
    return !!this.auth.currentUser;
  }

  getCurrentUser() {
    return this.auth.currentUser;
  }

  async getIdToken() {
    try {
      const user = this.auth.currentUser;
      if (user) {
        return await user.getIdToken();
      }
      throw new Error('No user logged in');
    } catch (error) {
      console.error('Error getting ID token:', error);
      throw error;
    }
  }

  async reloadUser() {
    try {
      const user = this.auth.currentUser;
      if (user) {
        await reload(user);
        return user.emailVerified;
      }
      return false;
    } catch (error) {
      console.error('Error reloading user:', error);
      return false;
    }
  }

  onAuthStateChanged(callback) {
    return onAuthStateChanged(this.auth, callback);
  }
}

export default BrowserAuthService;
