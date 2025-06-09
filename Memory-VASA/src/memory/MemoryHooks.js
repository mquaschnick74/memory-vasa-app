import { useState, useEffect, useCallback } from 'react';
import MemoryManager from './MemoryManager.js';

// Use MemoryManager singleton - initialize once
const memoryManager = MemoryManager.getInstance();

// Hook for conversation memory
export const useConversationMemory = (userUUID) => {
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load conversation history
  const loadHistory = useCallback(async () => {
    if (!userUUID) return;

    setIsLoading(true);
    setError(null);

    try {
      const history = await memoryManager.getConversationHistory(userUUID);
      setConversationHistory(history);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userUUID]);

  // Add new conversation entry
  const addConversation = useCallback(async (conversationData) => {
    if (!userUUID) {
      console.warn('No userUUID available for conversation storage');
      return;
    }

    try {
      const stored = await memoryManager.storeConversation(userUUID, conversationData);
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

  // Load history when userUUID changes
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

// Hook for CSS stage progression memory
export const useStageMemory = (userUUID) => {
  const [stageHistory, setStageHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Store stage progression
  const recordStageTransition = useCallback(async (stageData) => {
    if (!userUUID) return;

    try {
      await memoryManager.storeStageProgression(userUUID, stageData);
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

// Hook for user profile memory
export const useUserProfile = (userUUID) => {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load user profile
  const loadProfile = useCallback(async () => {
    if (!userUUID) return;

    setIsLoading(true);
    setError(null);

    try {
      const userProfile = await memoryManager.getUserProfile(userUUID);
      setProfile(userProfile);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userUUID]);

  // Update profile
  const updateProfile = useCallback(async (profileData) => {
    if (!userUUID) {
      console.warn('No userUUID available for profile update');
      return null;
    }

    try {
      setIsLoading(true);
      const result = await memoryManager.storeUserProfile(userUUID, profileData);
      setProfile({ ...profileData, userUUID });
      setError(null);
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Failed to update profile:', err);
      throw err; // Re-throw to allow caller to handle
    } finally {
      setIsLoading(false);
    }
  }, [userUUID]);

  // Load profile when userUUID changes
  useEffect(() => {
    if (!userUUID) {
      setProfile(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const profileData = await memoryManager.getUserProfile(userUUID);
        if (profileData && Object.keys(profileData).length > 0) {
          setProfile(profileData);
        } else {
          setProfile(null);
        }
      } catch (err) {
        // Only log error if it's not a 404 (profile not found)
        if (!err.message.includes('Profile not found') && !err.message.includes('404')) {
          setError(err.message);
          console.error('Failed to retrieve user profile:', err);
        } else {
          setProfile(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [userUUID]);

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    refreshProfile: loadProfile
  };
};

// Hook for conversation context injection
export const useConversationContext = (userUUID) => {
  const [context, setContext] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const getContext = useCallback(async () => {
    if (!userUUID) return null;

    setIsLoading(true);
    try {
      const contextData = await memoryManager.getConversationContext(userUUID);
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

// Hook for GDPR compliance
export const useDataManagement = () => {
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState(null);

  const clearUserData = useCallback(async (userUUID) => {
    if (!userUUID) {
      setClearError('No user UUID provided');
      return false;
    }

    setIsClearing(true);
    setClearError(null);

    try {
      const success = await memoryManager.clearUserData(userUUID);
      if (success) {
        setClearError(null);
      } else {
        setClearError('Clear operation returned false');
      }
      return success;
    } catch (error) {
      console.error('Failed to clear user data:', error);
      setClearError(error.message || 'Unknown error occurred');
      return false;
    } finally {
      setIsClearing(false);
    }
  }, []);

  return {
    clearUserData,
    isClearing,
    clearError
  };
};

export { memoryManager };

// Export getInstance for components that need it
export const getMemoryManager = () => MemoryManager.getInstance();