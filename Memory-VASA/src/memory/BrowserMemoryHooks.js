import { useState, useEffect, useCallback } from 'react';

// Browser-only memory management using direct API calls
class BrowserMemoryManager {
  constructor() {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    this.apiUrl = `${baseUrl}/api/memory`;
    this.localCache = new Map();
    this.maxCacheSize = 100;
    console.log('BrowserMemoryManager initialized with API URL:', this.apiUrl);
  }

  async storeConversation(userUUID, conversationData) {
    try {
      const memoryEntry = {
        userUUID,
        timestamp: new Date().toISOString(),
        ...conversationData
      };

      this.addToLocalCache(userUUID, memoryEntry);

      const response = await fetch(`${this.apiUrl}/conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memoryEntry)
      });

      if (!response.ok) {
        throw new Error(`Memory storage failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to store conversation memory:', error);
      this.fallbackToLocalStorage(userUUID, conversationData);
    }
  }

  async getConversationHistory(userUUID, limit = 50) {
    try {
      const cached = this.getFromLocalCache(userUUID);
      if (cached && cached.length > 0) {
        return cached.slice(-limit);
      }

      const response = await fetch(`${this.apiUrl}/conversation/${userUUID}?limit=${limit}`);

      if (!response.ok) {
        throw new Error(`Memory retrieval failed: ${response.statusText}`);
      }

      const history = await response.json();
      this.localCache.set(userUUID, history);
      return history;
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
        type: 'stage_progression',
        ...stageData
      };

      const response = await fetch(`${this.apiUrl}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stageEntry)
      });

      if (!response.ok) {
        throw new Error(`Stage storage failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to store stage progression:', error);
      this.fallbackToLocalStorage(`${userUUID}_stages`, stageData);
    }
  }

  async getUserProfile(userUUID) {
    try {
      const response = await fetch(`${this.apiUrl}/profile/${userUUID}`);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Profile retrieval failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to retrieve user profile:', error.message);
      return this.fallbackGetFromLocalStorage(`${userUUID}_profile`) || null;
    }
  }

  async storeUserProfile(userUUID, profileData) {
    try {
      const response = await fetch(`${this.apiUrl}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userUUID, ...profileData })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Profile stored:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to store profile:', error);
      throw error;
    }
  }

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

  async getConversationContext(userUUID, limit = 10) {
    try {
      const history = await this.getConversationHistory(userUUID, limit);

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
      if (stored) {
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
