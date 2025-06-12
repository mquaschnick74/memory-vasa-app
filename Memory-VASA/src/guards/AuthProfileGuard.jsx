import React, { useEffect, useState } from 'react';
import { useUserProfile } from '../memory/BrowserMemoryHooks.js';

// Authentication Profile Guard - prevents access without profile - WITH DEBUG LOGGING AND INLINE STYLES
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

  // Show loading while checking profile - FIXED: Using inline styles instead of Tailwind
  if (loading) {
    console.log('🛡️ AuthProfileGuard: Rendering loading state');
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e9ecef',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 24px auto'
          }}></div>
          <p style={{
            color: '#6c757d',
            fontSize: '18px',
            margin: '0'
          }}>
            Checking your profile...
          </p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Show error if profile check failed - FIXED: Using inline styles instead of Tailwind
  if (error) {
    console.log('🛡️ AuthProfileGuard: Rendering error state:', error);
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '20px' }}>
          <p style={{
            color: '#dc3545',
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '16px'
          }}>
            Unable to verify your profile
          </p>
          <p style={{
            color: '#6c757d',
            fontSize: '16px',
            margin: '0'
          }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  // Only render children if access is granted
  if (accessGranted) {
    console.log('🛡️ AuthProfileGuard: Rendering children (access granted)');
    return children;
  }

  // Default blocked access view - FIXED: Using inline styles instead of Tailwind
  console.log('🛡️ AuthProfileGuard: Rendering fallback blocked access view');
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px', padding: '20px' }}>
        <p style={{
          color: '#6c757d',
          fontSize: '18px',
          marginBottom: '20px'
        }}>
          Access requires profile setup
        </p>
        <div style={{
          marginTop: '16px',
          fontSize: '14px',
          color: '#8e8e93',
          backgroundColor: '#f8f9fa',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>Debug Info:</p>
          <p style={{ margin: '4px 0' }}>requiresProfile: {requiresProfile ? 'true' : 'false'}</p>
          <p style={{ margin: '4px 0' }}>requiresSetup: {requiresSetup ? 'true' : 'false'}</p>
          <p style={{ margin: '4px 0' }}>profileExists: {profileExists ? 'true' : 'false'}</p>
        </div>
      </div>
    </div>
  );
}

// Profile Creation Component - FIXED: Using inline styles instead of Tailwind
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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        padding: '40px',
        margin: '20px auto'
      }}>
        <h2 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: '30px',
          color: '#333',
          margin: '0 0 30px 0'
        }}>
          Create Your Therapeutic Profile
        </h2>
        
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          {/* Display Name */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Display Name *
            </label>
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: creating ? '#f9fafb' : 'white'
              }}
              placeholder="How would you like to be addressed?"
              disabled={creating}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>

          {/* Therapeutic Goals */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Therapeutic Goals * (Select all that apply)
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
              marginTop: '8px'
            }}>
              {therapeuticGoals.map((goal) => (
                <label key={goal} style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '14px',
                  cursor: creating ? 'not-allowed' : 'pointer',
                  opacity: creating ? 0.6 : 1,
                  padding: '4px'
                }}>
                  <input
                    type="checkbox"
                    checked={formData.therapeutic_goals.includes(goal)}
                    onChange={() => handleGoalToggle(goal)}
                    disabled={creating}
                    style={{
                      marginRight: '8px',
                      cursor: creating ? 'not-allowed' : 'pointer'
                    }}
                  />
                  <span>{goal}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Session Length */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Preferred Session Length
            </label>
            <select
              value={formData.session_length}
              onChange={(e) => setFormData(prev => ({ ...prev, session_length: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: creating ? '#f9fafb' : 'white',
                cursor: creating ? 'not-allowed' : 'pointer'
              }}
              disabled={creating}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            >
              <option value="short">Short (15-20 minutes)</option>
              <option value="standard">Standard (30-45 minutes)</option>
              <option value="extended">Extended (60+ minutes)</option>
            </select>
          </div>

          {/* Intensity */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Therapeutic Intensity
            </label>
            <select
              value={formData.intensity}
              onChange={(e) => setFormData(prev => ({ ...prev, intensity: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box',
                backgroundColor: creating ? '#f9fafb' : 'white',
                cursor: creating ? 'not-allowed' : 'pointer'
              }}
              disabled={creating}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            >
              <option value="gentle">Gentle (Slow pace, comfort focus)</option>
              <option value="moderate">Moderate (Balanced approach)</option>
              <option value="intensive">Intensive (Deep work, faster pace)</option>
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              color: '#dc2626',
              fontSize: '14px',
              textAlign: 'center',
              marginBottom: '20px',
              padding: '10px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px'
            }}>
              {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            paddingTop: '20px'
          }}>
            {onCancel && (
              <button
                type="button"
                onClick={() => {
                  console.log('📋 ProfileCreationForm: Cancel button clicked');
                  onCancel();
                }}
                disabled={creating}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#374151',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: creating ? 'not-allowed' : 'pointer',
                  opacity: creating ? 0.6 : 1,
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => {
                  if (!creating) e.target.style.backgroundColor = '#e5e7eb';
                }}
                onMouseOut={(e) => {
                  if (!creating) e.target.style.backgroundColor = '#f3f4f6';
                }}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={creating}
              style={{
                flex: 1,
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '500',
                color: 'white',
                backgroundColor: creating ? '#9ca3af' : '#2563eb',
                border: 'none',
                borderRadius: '6px',
                cursor: creating ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => {
                if (!creating) e.target.style.backgroundColor = '#1d4ed8';
              }}
              onMouseOut={(e) => {
                if (!creating) e.target.style.backgroundColor = '#2563eb';
              }}
            >
              {creating ? 'Creating...' : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Example App Integration - FIXED: Using inline styles instead of Tailwind
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
      <ProfileCreationForm
        userUUID={userUUID}
        onProfileCreated={handleProfileCreated}
        onCancel={() => {
          console.log('📋 AppWithProfileGuard: ProfileCreationForm cancelled');
          setShowProfileCreation(false);
        }}
      />
    );
  }

  if (showSetupCompletion) {
    console.log('🔧 AppWithProfileGuard: Rendering setup completion form');
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{
            fontSize: '18px',
            color: '#333',
            marginBottom: '20px'
          }}>
            Setup completion form would go here
          </p>
          <button
            onClick={() => {
              console.log('🔧 AppWithProfileGuard: Setup completion cancelled');
              setShowSetupCompletion(false);
            }}
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#fef2f2',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{
            color: '#dc2626',
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '16px'
          }}>
            Error in Profile Guard
          </p>
          <p style={{
            color: '#6b7280',
            fontSize: '16px',
            marginBottom: '8px'
          }}>
            Check console for details
          </p>
          <p style={{
            fontSize: '14px',
            color: '#9ca3af',
            marginTop: '8px'
          }}>
            UserUUID: {userUUID}
          </p>
        </div>
      </div>
    );
  }
}

export default AuthProfileGuard;
