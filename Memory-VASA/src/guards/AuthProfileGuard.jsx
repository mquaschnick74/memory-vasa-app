import React, { useEffect, useState } from 'react';
import { useUserProfile } from '../memory/BrowserMemoryHooks.js';

// Authentication Profile Guard - prevents access without profile
export function AuthProfileGuard({ userUUID, children, onProfileRequired, onSetupRequired }) {
  const { 
    profile, 
    setupStatus, 
    loading, 
    error, 
    requiresProfile, 
    requiresSetup,
    profileExists 
  } = useUserProfile(userUUID);

  const [accessGranted, setAccessGranted] = useState(false);

  useEffect(() => {
    if (loading) return; // Wait for profile check to complete

    if (requiresProfile) {
      // No profile exists - block access and show profile creation
      console.log('🚫 Access blocked: Profile required');
      setAccessGranted(false);
      if (onProfileRequired) {
        onProfileRequired({
          userUUID,
          message: 'Please create your therapeutic profile to continue',
          action: 'create_profile'
        });
      }
      return;
    }

    if (requiresSetup) {
      // Profile exists but setup not completed - block access and show setup
      console.log('🚫 Access blocked: Setup completion required');
      setAccessGranted(false);
      if (onSetupRequired) {
        onSetupRequired({
          userUUID,
          profile,
          message: 'Please complete your profile setup',
          action: 'complete_setup'
        });
      }
      return;
    }

    if (profileExists && setupStatus?.setup_completed) {
      // Profile exists and setup complete - grant access
      console.log('✅ Access granted: Profile verified');
      setAccessGranted(true);
      return;
    }

    // Fallback: block access if we can't determine status
    console.log('🚫 Access blocked: Unable to verify profile status');
    setAccessGranted(false);
  }, [loading, requiresProfile, requiresSetup, profileExists, setupStatus, userUUID, profile, onProfileRequired, onSetupRequired]);

  // Show loading while checking profile
  if (loading) {
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
    return children;
  }

  // Default blocked access view
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-600">Access requires profile setup</p>
      </div>
    </div>
  );
}

// Profile Creation Component
export function ProfileCreationForm({ userUUID, onProfileCreated, onCancel }) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.display_name.trim()) {
      setError('Please enter your display name');
      return;
    }

    if (formData.therapeutic_goals.length === 0) {
      setError('Please select at least one therapeutic goal');
      return;
    }

    try {
      setCreating(true);
      setError('');
      
      const result = await createProfile(formData);
      
      if (result.success) {
        console.log('✅ Profile created successfully');
        if (onProfileCreated) {
          onProfileCreated(result);
        }
      } else {
        setError(result.error || 'Failed to create profile');
      }
    } catch (err) {
      console.error('Profile creation error:', err);
      setError('Profile creation failed. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleGoalToggle = (goal) => {
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
              onClick={onCancel}
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

// Example App Integration
export function AppWithProfileGuard({ userUUID, children }) {
  const [showProfileCreation, setShowProfileCreation] = useState(false);
  const [showSetupCompletion, setShowSetupCompletion] = useState(false);

  const handleProfileRequired = (profileInfo) => {
    console.log('Profile required:', profileInfo);
    setShowProfileCreation(true);
  };

  const handleSetupRequired = (setupInfo) => {
    console.log('Setup required:', setupInfo);
    setShowSetupCompletion(true);
  };

  const handleProfileCreated = (result) => {
    console.log('Profile created:', result);
    setShowProfileCreation(false);
    // Profile guard will automatically re-check and grant access
  };

  if (showProfileCreation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <ProfileCreationForm
          userUUID={userUUID}
          onProfileCreated={handleProfileCreated}
          onCancel={() => setShowProfileCreation(false)}
        />
      </div>
    );
  }

  if (showSetupCompletion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p>Setup completion form would go here</p>
          <button
            onClick={() => setShowSetupCompletion(false)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthProfileGuard
      userUUID={userUUID}
      onProfileRequired={handleProfileRequired}
      onSetupRequired={handleSetupRequired}
    >
      {children}
    </AuthProfileGuard>
  );
}

export default AuthProfileGuard;
