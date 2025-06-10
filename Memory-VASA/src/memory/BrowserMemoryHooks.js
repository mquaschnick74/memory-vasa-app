import { useState, useEffect, useCallback } from 'react';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import app from '../firebase-config.js';

// Browser-only memory management using Firebase Firestore
class BrowserMemoryManager {
  constructor() {
    this.db = getFirestore(app);
    this.localCache = new Map();
    this.maxCacheSize = 100;
    console.log('BrowserMemoryManager initialized with Firebase Firestore');
  }

  async storeConversation(userUUID, conversationData) {
    try {
      const memoryEntry = {
        userUUID,
        timestamp: new Date().toISOString(),
        createdAt: serverTimestamp(),
        ...conversationData
      };

      // Create a new document with auto-generated ID
      const conversationRef = doc(collection(this.db, 'conversations'));
      await setDoc(conversationRef, memoryEntry);

      this.addToLocalCache(userUUID, memoryEntry);
      console.log('✅ Conversation stored in Firebase:', conversationRef.id);
      return { success: true, id: conversationRef.id };
    } catch (error) {
      console.error('Failed to store conversation memory:', error);
      this.fallbackToLocalStorage(userUUID, conversationData);
      return { success: false, error: error.message };
    }
  }

  async getConversationHistory(userUUID, limitCount = 50) {
    try {
      const cached = this.getFromLocalCache(userUUID);
      if (cached && cached.length > 0) {
        return cached.slice(-limitCount);
      }

      const q = query(
        collection(this.db, 'conversations'),
        where('userUUID', '==', userUUID),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const history = [];
      querySnapshot.forEach((doc) => {
        history.push({ id: doc.id, ...doc.data() });
      });

      const sortedHistory = history.reverse(); // Return in chronological order
      this.localCache.set(userUUID, sortedHistory);
      console.log(`✅ Retrieved ${history.length} conversations from Firebase`);
      return sortedHistory;
    } catch (error) {
      console.error('Failed to retrieve conversation history:', error);
      return this.fallbackGetFromLocalStorage(userUUID) || [];
    }
  }

  async storeStageProgression(userUUID, stageData) {
    try {
      const stageEntry = {
        userUUID,
        timestamp: new Date().toISOString(),
        createdAt: serverTimestamp(),
        type: 'stage_progression',
        ...stageData
      };

      const stageRef = doc(collection(this.db, 'stage_progressions'));
      await setDoc(stageRef, stageEntry);

      console.log('✅ Stage progression stored in Firebase:', stageRef.id);
      return { success: true, id: stageRef.id };
    } catch (error) {
      console.error('Failed to store stage progression:', error);
      this.fallbackToLocalStorage(`${userUUID}_stages`, stageData);
      return { success: false, error: error.message };
    }
  }

  async getUserProfile(userUUID) {
    try {
      const profileRef = doc(this.db, 'user_profiles', userUUID);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const profileData = profileSnap.data();
        console.log('✅ Profile retrieved from Firebase:', profileData);
        return profileData;
      } else {
        console.log('No profile found in Firebase for user:', userUUID);
        return null;
      }
    } catch (error) {
      console.error('Failed to retrieve user profile:', error.message);
      return this.fallbackGetFromLocalStorage(`${userUUID}_profile`) || null;
    }
  }

  async storeUserProfile(userUUID, profileData) {
    try {
      const profileRef = doc(this.db, 'user_profiles', userUUID);
      const profileEntry = {
        userUUID,
        lastUpdated: serverTimestamp(),
        updatedAt: new Date().toISOString(),
        ...profileData
      };

      await setDoc(profileRef, profileEntry, { merge: true });
      console.log('✅ Profile stored in Firebase:', profileEntry);
      return { success: true, data: profileEntry };
    } catch (error) {
      console.error('❌ Failed to store profile in Firebase:', error);
      throw error;
    }
  }

  async getConversationContext(userUUID, limitCount = 10) {
    try {
      const history = await this.getConversationHistory(userUUID, limitCount);

      if (!history || history.length === 0) {
        return null;
      }

      const contextEntries = history.map(entry => ({
        role: entry.type === 'user' ? 'user' : 'assistant',
        content: entry.content || entry.message || '',
        timestamp: entry.timestamp,
        stage: entry.stage || entry.css_stage
      }));

      return {
        summary: this.generateContextSummary(contextEntries),
        entries: contextEntries,
        lastSession: history[history.length - 1]?.timestamp
      };
    } catch (error) {
      console.error('Failed to get conversation context:', error);
      return null;
    }
  }

  generateContextSummary(entries) {
    if (!entries || entries.length === 0) return '';

    const userMessages = entries.filter(e => e.role === 'user').length;
    const assistantMessages = entries.filter(e => e.role === 'assistant').length;
    const stages = [...new Set(entries.filter(e => e.stage).map(e => e.stage))];

    let summary = `Previous conversation had ${userMessages} user messages and ${assistantMessages} VASA responses.`;

    if (stages.length > 0) {
      summary += ` CSS stages covered: ${stages.join(', ')}.`;
    }

    return summary;
  }

  // Keep existing local cache and fallback methods
  addToLocalCache(key, data) {
    if (this.localCache.size >= this.maxCacheSize) {
      const firstKey = this.localCache.keys().next().value;
      this.localCache.delete(firstKey);
    }

    const existing = this.localCache.get(key) || [];
    existing.push(data);
    this.localCache.set(key, existing);
  }

  getFromLocalCache(key) {
    return this.localCache.get(key) || [];
  }

  fallbackToLocalStorage(key, data) {
    try {
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(data);
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (error) {
      console.error('LocalStorage fallback failed:', error);
    }
  }

  fallbackGetFromLocalStorage(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (error) {
      console.error('LocalStorage retrieval failed:', error);
      return [];
    }
  }
}

const browserMemoryManager = new BrowserMemoryManager();

export const useConversationMemory = (userUUID) => {
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadHistory = useCallback(async () => {
    if (!userUUID) return;

    setIsLoading(true);
    setError(null);

    try {
      const history = await browserMemoryManager.getConversationHistory(userUUID);
      setConversationHistory(history);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userUUID]);

  const addConversation = useCallback(async (conversationData) => {
    if (!userUUID) {
      console.warn('No userUUID available for conversation storage');
      return;
    }

    try {
      const stored = await browserMemoryManager.storeConversation(userUUID, conversationData);
      if (stored && stored.success) {
        setConversationHistory(prev => [...prev, {
          userUUID,
          timestamp: new Date().toISOString(),
          ...conversationData
        }]);
      }
    } catch (err) {
      console.error('Failed to add conversation:', err);
      setError(err.message);
    }
  }, [userUUID]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    conversationHistory,
    isLoading,
    error,
    addConversation,
    refreshHistory: loadHistory
  };
};

export const useStageMemory = (userUUID) => {
  const [stageHistory, setStageHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const recordStageTransition = useCallback(async (stageData) => {
    if (!userUUID) return;

    try {
      await browserMemoryManager.storeStageProgression(userUUID, stageData);
      setStageHistory(prev => [...prev, {
        userUUID,
        timestamp: new Date().toISOString(),
        ...stageData
      }]);
    } catch (err) {
      setError(err.message);
    }
  }, [userUUID]);

  return {
    stageHistory,
    isLoading,
    error,
    recordStageTransition
  };
};

export const useUserProfile = (userUUID) => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async () => {
    if (!userUUID) return;

    setIsLoading(true);
    setError(null);

    try {
      const userProfile = await browserMemoryManager.getUserProfile(userUUID);
      setProfile(userProfile);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userUUID]);

  const updateProfile = useCallback(async (profileData) => {
    if (!userUUID) {
      console.warn('No userUUID available for profile update');
      return null;
    }

    try {
      setIsLoading(true);
      const result = await browserMemoryManager.storeUserProfile(userUUID, profileData);
      setProfile({ ...profileData, userUUID });
      setError(null);
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Failed to update profile:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [userUUID]);

  useEffect(() => {
    if (!userUUID) {
      setProfile(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    loadProfile();
  }, [userUUID, loadProfile]);

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    refreshProfile: loadProfile
  };
};

export const useConversationContext = (userUUID) => {
  const [context, setContext] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const getContext = useCallback(async () => {
    if (!userUUID) return null;

    setIsLoading(true);
    try {
      const contextData = await browserMemoryManager.getConversationContext(userUUID);
      setContext(contextData);
      return contextData;
    } catch (error) {
      console.error('Failed to get conversation context:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userUUID]);

  return {
    context,
    getContext,
    isLoading
  };
};

export const getBrowserMemoryManager = () => browserMemoryManager;
