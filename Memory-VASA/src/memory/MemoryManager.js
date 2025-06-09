class MemoryManager {
  static instance = null;
  static healthChecked = false;

  constructor(authService = null) {
    // Singleton pattern - return existing instance if it exists
    if (MemoryManager.instance) {
      return MemoryManager.instance;
    }

    this.authService = authService;
    // Use environment variable for API URL, fallback to local development
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    this.apiUrl = `${baseUrl}/api/memory`;
    
    // Initialize local cache
    this.localCache = new Map();
    this.maxCacheSize = 100;

    console.log('MemoryManager initialized with API URL:', this.apiUrl);
    console.log('Environment detected - hostname:', window.location.hostname);

    // Check backend health on initialization - but only once
    if (!MemoryManager.healthChecked) {
      this.checkHealth();
      MemoryManager.healthChecked = true;
    }

    // Store instance
    MemoryManager.instance = this;
  }

  // Static method to get singleton instance
  static getInstance(authService = null) {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager(authService);
    }
    return MemoryManager.instance;
  }

  async checkHealth() {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        console.log('✅ Backend health check passed');
      } else {
        console.warn('⚠️ Backend health check failed:', response.status);
      }
    } catch (error) {
      // Reduce console noise - only log if debugging is enabled
      if (process.env.NODE_ENV === 'development') {
        console.warn('Backend not accessible:', error.message);
      }
    }
  }

  // Get authentication headers
  async getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.authService && this.authService.isAuthenticated()) {
      try {
        const token = await this.authService.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        console.warn('Failed to get auth token:', error);
      }
    }

    return headers;
  }

  // Store conversation memory
  async storeConversation(userUUID, conversationData) {
    try {
      const memoryEntry = {
        userUUID,
        timestamp: new Date().toISOString(),
        ...conversationData
      };

      // Store locally first for immediate access
      this.addToLocalCache(userUUID, memoryEntry);

      // Send to persistent storage via webhook
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.apiUrl}/conversation`, {
        method: 'POST',
        headers,
        body: JSON.stringify(memoryEntry)
      });

      if (!response.ok) {
        throw new Error(`Memory storage failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to store conversation memory:', error);
      // Fallback to localStorage
      this.fallbackToLocalStorage(userUUID, conversationData);
    }
  }

  // Retrieve conversation history
  async getConversationHistory(userUUID, limit = 50) {
    try {
      // Check local cache first
      const cached = this.getFromLocalCache(userUUID);
      if (cached && cached.length > 0) {
        return cached.slice(-limit);
      }

      // Fetch from persistent storage
      const response = await fetch(`${this.apiUrl}/conversation/${userUUID}?limit=${limit}`);

      if (!response.ok) {
        throw new Error(`Memory retrieval failed: ${response.statusText}`);
      }

      const history = await response.json();

      // Update local cache
      this.localCache.set(userUUID, history);

      return history;
    } catch (error) {
      console.error('Failed to retrieve conversation history:', error);
      // Fallback to localStorage
      return this.fallbackGetFromLocalStorage(userUUID) || [];
    }
  }

  // Store CSS stage progression
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
        headers: {
          'Content-Type': 'application/json',
        },
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

  // Get user's symbolic identity and progress
  async getUserProfile(userUUID) {
    try {
      const response = await fetch(`${this.apiUrl}/profile/${userUUID}`);

      if (response.status === 404) {
        console.log('Profile not found, returning null');
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Profile retrieval failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to retrieve user profile:', error.message);
      return this.fallbackGetFromLocalStorage(`${userUUID}_profile`) || null;
    }
  }

  // Store user profile
  async storeUserProfile(userUUID, profileData) {
    try {
      const response = await fetch(`${this.apiUrl}/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userUUID,
          ...profileData
        })
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

  // Store stage progression (uses subcollection endpoint)
  async storeStageProgression2(userUUID, stageData) {
    try {
      const response = await fetch(`${this.apiUrl}/stage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userUUID,
          ...stageData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Stage progression stored in subcollection:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to store stage progression:', error);
      throw error;
    }
  }

  // Store user context (uses subcollection endpoint)
  async storeUserContext(userUUID, contextData) {
    try {
      const response = await fetch(`${this.apiUrl}/context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userUUID,
          ...contextData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ User context stored in subcollection:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to store user context:', error);
      throw error;
    }
  }

  // Local cache management
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

  // LocalStorage fallbacks
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

  // Get conversation context for agent injection
  async getConversationContext(userUUID, limit = 10) {
    try {
      const history = await this.getConversationHistory(userUUID, limit);

      if (!history || history.length === 0) {
        return null;
      }

      // Format for agent context
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

  // Generate a summary of conversation context
  generateContextSummary(entries) {
    if (!entries || entries.length === 0) return '';

    const userMessages = entries.filter(e => e.role === 'user').length;
    const assistantMessages = entries.filter(e => e.role === 'assistant').length;
    const stages = [...new Set(entries.filter(e => e.stage).map(e => e.stage))];

    let summary = `Previous conversation had ${userMessages} user messages and ${assistantMessages} VASA responses.`;

    if (stages.length > 0) {
      summary += ` CSS stages covered: ${stages.join(', ')}.`;
    }

    // Add key topics/themes
    const recentContent = entries.slice(-5).map(e => e.content).join(' ');
    if (recentContent.includes('contradiction')) summary += ' Discussion involved contradictions/tensions.';
    if (recentContent.includes('completion')) summary += ' Progress toward completion was explored.';
    if (recentContent.includes('fragment')) summary += ' Fragmentation themes were discussed.';

    return summary;
  }

  // Get user stage progressions
  async getUserStageProgressions(userUUID, limit = 20) {
    try {
      const response = await fetch(`${this.apiUrl}/stages/${userUUID}?limit=${limit}`);

      if (!response.ok) {
        throw new Error(`Stage retrieval failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to retrieve stage progressions:', error);
      return this.fallbackGetFromLocalStorage(`${userUUID}_stages`) || [];
    }
  }

  // Clear user data (GDPR compliance)
  async clearUserData(userUUID) {
    try {
      console.log('Attempting to clear user data for:', userUUID);
      console.log('API URL:', `${this.apiUrl}/user/${userUUID}`);

      const response = await fetch(`${this.apiUrl}/user/${userUUID}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Data deletion failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Clear local cache and storage
      this.localCache.delete(userUUID);
      localStorage.removeItem(userUUID);
      localStorage.removeItem(`${userUUID}_stages`);
      localStorage.removeItem(`${userUUID}_profile`);

      console.log('✅ User data cleared successfully');
      return true;
    } catch (error) {
      console.error('Failed to clear user data:', error.message || error);

      // Fallback: clear local data even if server request fails
      try {
        this.localCache.delete(userUUID);
        localStorage.removeItem(userUUID);
        localStorage.removeItem(`${userUUID}_stages`);
        localStorage.removeItem(`${userUUID}_profile`);
        console.log('✅ Local data cleared as fallback');
        return true;
      } catch (localError) {
        console.error('Failed to clear even local data:', localError);
        return false;
      }
    }
  }
}

export default MemoryManager;
