import React, { useState, useEffect } from 'react';
import VASAInterface from './VoiceAgent';
import { useUserProfile } from './memory/BrowserMemoryHooks.js';

// Profile Guard Component
function ProfileGuard({ userUUID, children }) {
  const { 
    profile, 
    setupStatus, 
    loading, 
    error, 
    requiresProfile, 
    createProfile 
  } = useUserProfile(userUUID);

  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    display_name: '',
    therapeutic_goals: [],
    session_length: 'standard',
    intensity: 'moderate',
    communication_style: 'conversational'
  });
  const [creatingProfile, setCreatingProfile] = useState(false);

  // Check profile status and determine what to show
  useEffect(() => {
    if (!loading) {
      console.log('Profile check:', { requiresProfile, setupStatus });
      
      if (requiresProfile || !setupStatus?.profile_exists) {
        console.log('🚫 Profile required - blocking VASA access');
        setShowProfileForm(true);
      } else if (setupStatus?.profile_exists && setupStatus?.setup_completed) {
        console.log('✅ Profile exists and complete - allowing VASA access');
        setShowProfileForm(false);
      }
    }
  }, [loading, requiresProfile, setupStatus]);

  // Handle profile form submission
  async function handleProfileSubmit(e) {
    e.preventDefault();
    
    if (!profileFormData.display_name.trim()) {
      alert('Please enter your display name');
      return;
    }

    if (!profileFormData.therapeutic_goals.length) {
      alert('Please select at least one therapeutic goal');
      return;
    }

    try {
      setCreatingProfile(true);
      console.log('Creating therapeutic profile with data:', profileFormData);
      
      const result = await createProfile(profileFormData);
      
      if (result.success) {
        console.log('✅ Therapeutic profile created successfully');
        setShowProfileForm(false);
        // The useUserProfile hook will automatically reload and detect the new profile
      } else {
        console.error('Profile creation failed:', result.error);
        alert(result.error || 'Failed to create profile. Please try again.');
      }
    } catch (error) {
      console.error('Profile creation error:', error);
      alert('Profile creation failed. Please try again.');
    } finally {
      setCreatingProfile(false);
    }
  }

  // Show loading while checking profile
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#b23cfc',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid #ffffff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p>Checking your therapeutic profile...</p>
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

  // Show error if profile check failed
  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#b23cfc',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>
            Unable to verify your therapeutic profile
          </p>
          <p style={{ fontSize: '1rem', marginBottom: '30px', opacity: 0.8 }}>
            {error}
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#ffffff',
              color: '#b23cfc',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show profile creation form if needed
  if (showProfileForm || requiresProfile) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#b23cfc',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '500px',
          width: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          padding: '40px',
          borderRadius: '20px',
          backdropFilter: 'blur(10px)'
        }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '10px'
          }}>
            Create Your Therapeutic Profile
          </h2>
          
          <p style={{
            textAlign: 'center',
            marginBottom: '30px',
            opacity: 0.9,
            fontSize: '1.1rem'
          }}>
            Welcome to Memory VASA! Let's set up your therapeutic profile to begin your Core Symbol Set journey.
          </p>
          
          <form onSubmit={handleProfileSubmit}>
            {/* Display Name */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: 'bold',
                marginBottom: '8px'
              }}>
                Display Name *
              </label>
              <input
                type="text"
                value={profileFormData.display_name}
                onChange={(e) => setProfileFormData(prev => ({ 
                  ...prev, 
                  display_name: e.target.value 
                }))}
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '1rem',
                  border: 'none',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: '#333'
                }}
                placeholder="How would you like to be addressed?"
                required
                disabled={creatingProfile}
              />
            </div>

            {/* Therapeutic Goals */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: 'bold',
                marginBottom: '8px'
              }}>
                Primary Therapeutic Goal *
              </label>
              <select
                value={profileFormData.therapeutic_goals[0] || ''}
                onChange={(e) => setProfileFormData(prev => ({
                  ...prev,
                  therapeutic_goals: e.target.value ? [e.target.value] : []
                }))}
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '1rem',
                  border: 'none',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: '#333'
                }}
                required
                disabled={creatingProfile}
              >
                <option value="">Select your primary goal</option>
                <option value="Emotional Regulation">Emotional Regulation</option>
                <option value="Relationship Improvement">Relationship Improvement</option>
                <option value="Trauma Recovery">Trauma Recovery</option>
                <option value="Self-Discovery">Self-Discovery</option>
                <option value="Anxiety Management">Anxiety Management</option>
                <option value="Personal Growth">Personal Growth</option>
                <option value="Communication Skills">Communication Skills</option>
                <option value="Identity Integration">Identity Integration</option>
              </select>
            </div>

            {/* Session Length */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: 'bold',
                marginBottom: '8px'
              }}>
                Preferred Session Length
              </label>
              <select
                value={profileFormData.session_length}
                onChange={(e) => setProfileFormData(prev => ({
                  ...prev,
                  session_length: e.target.value
                }))}
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '1rem',
                  border: 'none',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: '#333'
                }}
                disabled={creatingProfile}
              >
                <option value="short">Short (15-20 minutes)</option>
                <option value="standard">Standard (30-45 minutes)</option>
                <option value="extended">Extended (60+ minutes)</option>
              </select>
            </div>

            {/* Intensity */}
            <div style={{ marginBottom: '30px' }}>
              <label style={{
                display: 'block',
                fontSize: '1rem',
                fontWeight: 'bold',
                marginBottom: '8px'
              }}>
                Therapeutic Intensity
              </label>
              <select
                value={profileFormData.intensity}
                onChange={(e) => setProfileFormData(prev => ({
                  ...prev,
                  intensity: e.target.value
                }))}
                style={{
                  width: '100%',
                  padding: '15px',
                  fontSize: '1rem',
                  border: 'none',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: '#333'
                }}
                disabled={creatingProfile}
              >
                <option value="gentle">Gentle (Slow pace, comfort focus)</option>
                <option value="moderate">Moderate (Balanced approach)</option>
                <option value="intensive">Intensive (Deep work, faster pace)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={creatingProfile}
              style={{
                width: '100%',
                padding: '15px',
                backgroundColor: creatingProfile ? '#6b7280' : '#4CAF50',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: creatingProfile ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              {creatingProfile ? 'Creating Profile...' : 'Create Profile & Start Journey'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Profile exists and setup complete - show main app
  if (setupStatus?.profile_exists && setupStatus?.setup_completed) {
    return children;
  }

  // Fallback loading state
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#b23cfc',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <p>Setting up your therapeutic session...</p>
    </div>
  );
}

// User UUID Detector Component
function UserUUIDDetector({ children }) {
  const [userUUID, setUserUUID] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to get userUUID from various sources
    const detectUserUUID = () => {
      // Method 1: From localStorage (your current auth)
      const storedUUID = localStorage.getItem('userUUID');
      if (storedUUID) {
        console.log('Found userUUID in localStorage:', storedUUID);
        setUserUUID(storedUUID);
        setLoading(false);
        return;
      }

      // Method 2: Check if auth service has current user
      const checkAuthService = async () => {
        try {
          const { default: BrowserAuthService } = await import('./services/BrowserAuthService.js');
          const auth = new BrowserAuthService();
          const currentUser = auth.getCurrentUser();
          
          if (currentUser && currentUser.uid) {
            console.log('Found userUUID from auth service:', currentUser.uid);
            setUserUUID(currentUser.uid);
          } else {
            console.log('No authenticated user found');
            setUserUUID(null);
          }
        } catch (error) {
          console.error('Failed to check auth service:', error);
          setUserUUID(null);
        } finally {
          setLoading(false);
        }
      };

      checkAuthService();
    };

    detectUserUUID();

    // Listen for userUUID changes in localStorage
    const handleStorageChange = (e) => {
      if (e.key === 'userUUID') {
        setUserUUID(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#b23cfc',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  // If no userUUID, show the VASAInterface (which will handle auth)
  if (!userUUID) {
    return children;
  }

  // If userUUID exists, wrap with profile guard
  return (
    <ProfileGuard userUUID={userUUID}>
      {children}
    </ProfileGuard>
  );
}

// Main App Component
function App() {
  return (
    <UserUUIDDetector>
      <VASAInterface />
    </UserUUIDDetector>
  );
}

export default App;
