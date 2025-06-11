import React, { useEffect, useState } from 'react';
import { useUserProfile } from '../memory/BrowserMemoryHooks.js';

// Authentication Profile Guard - prevents access without profile - WITH DEBUG LOGGING
export function AuthProfileGuard({ userUUID, children, onProfileRequired, onSetupRequired }) {
  console.log('🛡️ AuthProfileGuard: Component rendered with props:', {
    userUUID,
    hasChildren: !!children,
    hasOnProfileRequired: !!onProfileRequired,
    hasOnSetupRequired: !!onSetupRequired
  });

  const hookResult = useUserProfile(userUUID);
  const { 
    profile, 
    setupStatus, 
    loading, 
    error, 
    requiresProfile, 
    requiresSetup,
    profileExists 
  } = hookResult;

  // 🔍 DEBUG: Log the useUserProfile hook results
  console.log('🛡️ AuthProfileGuard: useUserProfile hook returned:', {
    userUUID,
    profile: profile ? 'EXISTS' : 'NULL',
    setupStatus: setupStatus ? 'EXISTS' : 'NULL',
    loading,
    error: error || 'NONE',
    requiresProfile,
    requiresSetup,
    profileExists,
    setupCompleted: setupStatus?.setup_completed,
    fullHookResult: hookResult
  });

  const [accessGranted, setAccessGranted] = useState(false);

  useEffect(() => {
    console.log('🛡️ AuthProfileGuard: useEffect triggered with state:', {
      loading,
      requiresProfile,
      requiresSetup,
      profileExists,
      setupCompleted: setupStatus?.setup_completed,
      userUUID,
      accessGranted
    });

    if (loading) {
      console.log('⏳ AuthProfileGuard: Still loading profile, waiting...');
      return; // Wait for profile check to complete
    }

    if (requiresProfile) {
      // No profile exists - block access and show profile creation
      console.log('🚫 AuthProfileGuard: Profile required - blocking access');
      setAccessGranted(false);
      if (onProfileRequired) {
        console.log('📞 AuthProfileGuard: Calling onProfileRequired callback');
        const profileInfo = {
          userUUID,
          message: 'Please create your therapeutic profile to continue',
          action: 'create_profile'
        };
        console.log('📞 AuthProfileGuard: Profile info being sent:', profileInfo);
        onProfileRequired(profileInfo);
        console.log('✅ AuthProfileGuard: onProfileRequired callback completed');
      } else {
        console.error('❌ AuthProfileGuard: onProfileRequired callback is missing!');
      }
      return;
    }

    if (requiresSetup) {
      // Profile exists but setup not completed - block access and show setup
      console.log('🚫 AuthProfileGuard: Setup completion required - blocking access');
      setAccessGranted(false);
      if (onSetupRequired) {
        console.log('📞 AuthProfileGuard: Calling onSetupRequired callback');
        const setupInfo = {
          userUUID,
          profile,
          message: 'Please complete your profile setup',
          action: 'complete_setup'
        };
        console.log('📞 AuthProfileGuard: Setup info being sent:', setupInfo);
        onSetupRequired(setupInfo);
        console.log('✅ AuthProfileGuard: onSetupRequired callback completed');
      } else {
        console.error('❌ AuthProfileGuard: onSetupRequired callback is missing!');
      }
      return;
    }

    if (profileExists && setupStatus?.setup_completed) {
      // Profile exists and setup complete - grant access
      console.log('✅ AuthProfileGuard: Profile exists and setup complete - granting access');
      setAccessGranted(true);
      return;
    }

    // Fallback: block access if we can't determine status
    console.log('🚫 AuthProfileGuard: Unable to verify profile status - blocking access as fallback');
    console.log('🚫 AuthProfileGuard: Fallback triggered with values:', {
      profileExists,
      setupCompleted: setupStatus?.setup_completed,
      setupStatus
    });
    setAccessGranted(false);
  }, [loading, requiresProfile, requiresSetup, profileExists, setupStatus, userUUID, profile, onProfileRequired, onSetupRequired]);

  // 🔍 DEBUG: Log current render decision
  console.log('🛡️ AuthProfileGuard: Render decision state:', {
    loading,
    error: !!error,
    accessGranted,
    willShowLoading: loading,
    willShowError: !!error,
    willShowChildren: accessGranted,
    willShowFallback: !loading && !error && !accessGranted
  });

  // Show loading while checking profile
  if (loading) {
    console.log('🛡️ AuthProfileGuard: Rendering loading state');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking your profile...</p>
        </div>
      </div>
    );
  }

  // Show error if profile check failed
  if (error) {
    console.log('🛡️ AuthProfileGuard: Rendering error state:', error);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Unable to verify your profile</p>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Only render children if access is granted
  if (accessGranted) {
    console.log('🛡️ AuthProfileGuard: Rendering children (access granted)');
    return children;
  }

  // Default blocked access view
  console.log('🛡️ AuthProfileGuard: Rendering fallback blocked access view');
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-600">Access requires profile setup</p>
        <div className="mt-4 text-sm text-gray-500">
          <p>Debug Info:</p>
          <p>requiresProfile: {requiresProfile ? 'true' : 'false'}</p>
          <p>requiresSetup: {requiresSetup ? 'true' : 'false'}</p>
          <p>profileExists: {profileExists ? 'true' : 'false'}</p>
        </div>
      </div>
    </div>
  );
}

// Profile Creation Component - WITH DEBUG LOGGING
export function ProfileCreationForm({ userUUID, onProfileCreated, onCancel }) {
  console.log('📋 ProfileCreationForm: Component rendered with props:', {
    userUUID,
    hasOnProfileCreated: !!onProfileCreated,
    hasOnCancel: !!onCancel
  });

  const { createProfile } = useUserProfile(userUUID);
  const [formData, setFormData] = useState({
    display_name: '',
    therapeutic_goals: [],
    session_length: 'standard',
    intensity: 'moderate',
    communication_style: 'conversational'
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  console.log('📋 ProfileCreationForm: Current form state:', {
    formData,
    creating,
    error: error || 'NONE',
    hasCreateProfile: !!createProfile
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('📋 ProfileCreationForm: Form submitted with data:', formData);
    
    if (!formData.display_name.trim()) {
      console.log('❌ ProfileCreationForm: Validation failed - missing display name');
      setError('Please enter your display name');
      return;
    }

    if (formData.therapeutic_goals.length === 0) {
      console.log('❌ ProfileCreationForm: Validation failed - no therapeutic goals selected');
      setError('Please select at least one therapeutic goal');
      return;
    }

    try {
      setCreating(true);
      setError('');
      console.log('📋 ProfileCreationForm: Starting profile creation...');
      
      const result = await createProfile(formData);
      console.log('📋 ProfileCreationForm: Profile creation result:', result);
      
      if (result.success) {
        console.log('✅ ProfileCreationForm: Profile created successfully');
        if (onProfileCreated) {
          console.log('📞 ProfileCreationForm: Calling onProfileCreated callback');
          onProfileCreated(result);
          console.log('✅ ProfileCreationForm: onProfileCreated callback completed');
        } else {
          console.log('⚠️ ProfileCreationForm: No onProfileCreated callback provided');
        }
      } else {
        console.log('❌ ProfileCreationForm: Profile creation failed:', result.error);
        setError(result.error || 'Failed to create profile');
      }
    } catch (err) {
      console.error('🚨 ProfileCreationForm: Profile creation error:', err);
      setError('Profile creation failed. Please try again.');
    } finally {
      setCreating(false);
      console.log('📋 ProfileCreationForm: Profile creation process completed');
    }
  };

  const handleGoalToggle = (goal) => {
    console.log('📋 ProfileCreationForm: Toggling goal:', goal);
    setFormData(prev => ({
      ...prev,
      therapeutic_goals: prev.therapeutic_goals.includes(goal)
        ? prev.therapeutic_goals.filter(g => g !== goal)
        : [...prev.therapeutic_goals, goal]
    }));
  };

  const therapeuticGoals = [
    'Emotional Regulation',
    'Relationship Improvement',
    'Trauma Recovery',
    'Self-Discovery',
    'Anxiety Management',
    'Personal Growth',
    'Communication Skills',
    'Identity Integration'
  ];

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-center mb-6">Create Your Therapeutic Profile</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Display Name *
          </label>
          <input
            type="text"
            value={formData.display_name}
            onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="How would you like to be addressed?"
            disabled={creating}
          />
        </div>

        {/* Therapeutic Goals */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Therapeutic Goals * (Select all that apply)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {therapeuticGoals.map((goal) => (
              <label key={goal} className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.therapeutic_goals.includes(goal)}
                  onChange={() => handleGoalToggle(goal)}
                  disabled={creating}
                  className="rounded"
                />
                <span>{goal}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Session Length */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preferred Session Length
          </label>
          <select
            value={formData.session_length}
            onChange={(e) => setFormData(prev => ({ ...prev, session_length: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={creating}
          >
            <option value="short">Short (15-20 minutes)</option>
            <option value="standard">Standard (30-45 minutes)</option>
            <option value="extended">Extended (60+ minutes)</option>
          </select>
        </div>

        {/* Intensity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Therapeutic Intensity
          </label>
          <select
            value={formData.intensity}
            onChange={(e) => setFormData(prev => ({ ...prev, intensity: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={creating}
          >
            <option value="gentle">Gentle (Slow pace, comfort focus)</option>
            <option value="moderate">Moderate (Balanced approach)</option>
            <option value="intensive">Intensive (Deep work, faster pace)</option>
          </select>
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-red-600 text-sm text-center">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={() => {
                console.log('📋 ProfileCreationForm: Cancel button clicked');
                onCancel();
              }}
              disabled={creating}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={creating}
            className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Example App Integration - WITH COMPREHENSIVE DEBUG LOGGING
export function AppWithProfileGuard({ userUUID, children }) {
  console.log('🎯 AppWithProfileGuard: Component rendered with props:', {
    userUUID,
    hasChildren: !!children,
    childrenType: typeof children
  });

  const [showProfileCreation, setShowProfileCreation] = useState(false);
  const [showSetupCompletion, setShowSetupCompletion] = useState(false);

  // 🔍 DEBUG: Log current component state
  console.log('🎯 AppWithProfileGuard: Current state:', {
    showProfileCreation,
    showSetupCompletion,
    userUUID
  });

  const handleProfileRequired = (profileInfo) => {
    console.log('🎯 AppWithProfileGuard: handleProfileRequired called with:', profileInfo);
    console.log('🎯 AppWithProfileGuard: Setting showProfileCreation to true');
    setShowProfileCreation(true);
    console.log('🎯 AppWithProfileGuard: showProfileCreation state updated');
  };

  const handleSetupRequired = (setupInfo) => {
    console.log('🎯 AppWithProfileGuard: handleSetupRequired called with:', setupInfo);
    console.log('🎯 AppWithProfileGuard: Setting showSetupCompletion to true');
    setShowSetupCompletion(true);
    console.log('🎯 AppWithProfileGuard: showSetupCompletion state updated');
  };

  const handleProfileCreated = (result) => {
    console.log('🎯 AppWithProfileGuard: handleProfileCreated called with:', result);
    console.log('🎯 AppWithProfileGuard: Setting showProfileCreation to false');
    setShowProfileCreation(false);
    console.log('🎯 AppWithProfileGuard: Profile guard will automatically re-check and grant access');
  };

  // 🔍 DEBUG: Log render decision
  console.log('🎯 AppWithProfileGuard: Render decision:', {
    willShowProfileCreation: showProfileCreation,
    willShowSetupCompletion: showSetupCompletion,
    willShowAuthGuard: !showProfileCreation && !showSetupCompletion
  });

  if (showProfileCreation) {
    console.log('📋 AppWithProfileGuard: Rendering ProfileCreationForm');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <ProfileCreationForm
          userUUID={userUUID}
          onProfileCreated={handleProfileCreated}
          onCancel={() => {
            console.log('📋 AppWithProfileGuard: ProfileCreationForm cancelled');
            setShowProfileCreation(false);
          }}
        />
      </div>
    );
  }

  if (showSetupCompletion) {
    console.log('🔧 AppWithProfileGuard: Rendering setup completion form');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p>Setup completion form would go here</p>
          <button
            onClick={() => {
              console.log('🔧 AppWithProfileGuard: Setup completion cancelled');
              setShowSetupCompletion(false);
            }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  console.log('🛡️ AppWithProfileGuard: Rendering AuthProfileGuard with children');
  console.log('🛡️ AppWithProfileGuard: Passing callbacks to AuthProfileGuard:', {
    hasOnProfileRequired: !!handleProfileRequired,
    hasOnSetupRequired: !!handleSetupRequired
  });

  try {
    const result = (
      <AuthProfileGuard
        userUUID={userUUID}
        onProfileRequired={handleProfileRequired}
        onSetupRequired={handleSetupRequired}
      >
        {children}
      </AuthProfileGuard>
    );
    console.log('✅ AppWithProfileGuard: Successfully created AuthProfileGuard component');
    return result;
  } catch (error) {
    console.error('🚨 AppWithProfileGuard: Error creating AuthProfileGuard:', error);
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error in Profile Guard</p>
          <p className="text-gray-600">Check console for details</p>
          <p className="text-sm text-gray-500 mt-2">UserUUID: {userUUID}</p>
        </div>
      </div>
    );
  }
}

export default AuthProfileGuard;
