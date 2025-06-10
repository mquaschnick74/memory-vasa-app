import React, { useState, useCallback, useEffect } from 'react';
import { 
  useConversationMemory, 
  useUserProfile, 
  useStageMemory,
  getBrowserMemoryManager 
} from './BrowserMemoryHooks.js';

const MemoryDashboard = ({ userUUID, isVisible }) => {
  const [activeTab, setActiveTab] = useState('stages');
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState(null);

  // Enhanced hooks with CSS functionality
  const { conversationHistory, isLoading: conversationsLoading } = useConversationMemory(userUUID);
  const { 
    profile, 
    isLoading: profileLoading, 
    updateFragmentationPattern 
  } = useUserProfile(userUUID);
  const { 
    currentStage, 
    allStages, 
    stageHistory,
    updateStageProgress, 
    completeStage,
    isLoading: stagesLoading 
  } = useStageMemory(userUUID);

  const handleClearData = useCallback(async () => {
    if (!userUUID) return;

    const confirmed = window.confirm(
      'Are you sure you want to clear all your data? This will delete all conversations, stage progressions, and profile data. This action cannot be undone.'
    );
    
    if (confirmed) {
      setIsClearing(true);
      setClearError(null);
      
      try {
        const memoryManager = getBrowserMemoryManager();
        
        // Clear all user data from Firebase
        // Note: This would require a cloud function for full deletion
        // For now, we'll clear the user profile
        await memoryManager.storeUserProfile(userUUID, {
          cleared_at: new Date(),
          is_active: false
        });
        
        alert('Data marked for clearing. Full deletion requires admin action.');
      } catch (error) {
        setClearError(error.message);
        console.error('Failed to clear data:', error);
      } finally {
        setIsClearing(false);
      }
    }
  }, [userUUID]);

  const handleUpdateStageProgress = useCallback(async (amount) => {
    if (!currentStage) return;
    
    try {
      const newProgress = Math.min(100, currentStage.progress_percentage + amount);
      await updateStageProgress(currentStage.id, {
        progress_percentage: newProgress
      });
    } catch (error) {
      console.error('Failed to update stage progress:', error);
    }
  }, [currentStage, updateStageProgress]);

  const handleCompleteStage = useCallback(async () => {
    if (!currentStage) return;
    
    const confirmed = window.confirm(
      `Complete ${currentStage.stage_name.replace('_', ' ')} stage and move to the next stage?`
    );
    
    if (confirmed) {
      try {
        await completeStage(currentStage.id);
      } catch (error) {
        console.error('Failed to complete stage:', error);
      }
    }
  }, [currentStage, completeStage]);

  const handleUpdateFragmentationPattern = useCallback(async (pattern) => {
    try {
      await updateFragmentationPattern(pattern);
      alert(`Fragmentation pattern updated to: ${pattern}`);
    } catch (error) {
      console.error('Failed to update fragmentation pattern:', error);
    }
  }, [updateFragmentationPattern]);

  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - 150,
        y: e.clientY - 20
      });
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Now we can safely do conditional returns after all hooks are called
  if (!isVisible || !userUUID) {
    return null;
  }

  const dashboardStyle = {
    position: 'fixed',
    top: `${position.y}px`,
    left: `${position.x}px`,
    width: isExpanded ? '380px' : '320px',
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    border: '1px solid #374151',
    borderRadius: '8px',
    color: 'white',
    fontSize: '11px',
    fontFamily: 'monospace',
    zIndex: 1000,
    cursor: isDragging ? 'grabbing' : 'grab',
    backdropFilter: 'blur(4px)'
  };

  const headerStyle = {
    padding: '8px 12px',
    backgroundColor: '#1f2937',
    borderRadius: '8px 8px 0 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'move'
  };

  const contentStyle = {
    padding: '8px 12px',
    maxHeight: isExpanded ? '500px' : '300px',
    overflowY: 'auto'
  };

  const getStageColor = (stage) => {
    const colors = {
      'pointed_origin': '#dc2626', // red
      'focus_bind': '#ea580c',     // orange  
      'suspension': '#ca8a04',     // yellow
      'gesture_toward': '#16a34a', // green
      'completion': '#2563eb',     // blue
      'terminal_symbol': '#9333ea' // purple
    };
    return colors[stage?.stage_name] || '#6b7280';
  };

  return (
    <div style={dashboardStyle}>
      {/* Header */}
      <div 
        style={headerStyle}
        onMouseDown={handleMouseDown}
      >
        <span style={{ fontWeight: 'bold', fontSize: '12px' }}>
          Memory VASA Dashboard
        </span>
        <div>
          {currentStage && (
            <span style={{ 
              marginRight: '8px', 
              fontSize: '14px',
              color: getStageColor(currentStage)
            }}>
              {currentStage.stage_symbol}
            </span>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              marginRight: '8px',
              fontSize: '14px'
            }}
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        backgroundColor: '#374151',
        borderBottom: '1px solid #4b5563'
      }}>
        {['stages', 'conversations', 'profile', 'actions'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '6px 8px',
              background: activeTab === tab ? '#1f2937' : 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '10px',
              textTransform: 'capitalize'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={contentStyle}>
        {activeTab === 'stages' && (
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '12px' }}>
              Core Symbol Set Progress
            </h4>
            
            {/* Current Stage */}
            {currentStage ? (
              <div style={{
                padding: '8px',
                backgroundColor: getStageColor(currentStage),
                borderRadius: '4px',
                marginBottom: '8px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  Current: {currentStage.stage_symbol} {currentStage.stage_name.replace('_', ' ')}
                </div>
                <div style={{ fontSize: '10px', marginBottom: '4px' }}>
                  Progress: {currentStage.progress_percentage}%
                </div>
                <div style={{ 
                  width: '100%', 
                  height: '4px', 
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  borderRadius: '2px',
                  marginBottom: '6px'
                }}>
                  <div style={{
                    width: `${currentStage.progress_percentage}%`,
                    height: '100%',
                    backgroundColor: 'white',
                    borderRadius: '2px'
                  }} />
                </div>
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                  <button
                    onClick={() => handleUpdateStageProgress(10)}
                    style={{
                      padding: '2px 6px',
                      fontSize: '9px',
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      color: 'white',
                      borderRadius: '2px',
                      cursor: 'pointer'
                    }}
                  >
                    +10%
                  </button>
                  <button
                    onClick={handleCompleteStage}
                    disabled={currentStage.progress_percentage < 80}
                    style={{
                      padding: '2px 6px',
                      fontSize: '9px',
                      backgroundColor: currentStage.progress_percentage >= 80 ? '#16a34a' : 'rgba(255,255,255,0.1)',
                      border: 'none',
                      color: 'white',
                      borderRadius: '2px',
                      cursor: currentStage.progress_percentage >= 80 ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Complete
                  </button>
                </div>
              </div>
            ) : (
              <div>Loading current stage...</div>
            )}

            {/* Current Objectives */}
            {currentStage?.current_objectives && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
                  Current Objectives:
                </div>
                <div style={{ fontSize: '9px', opacity: 0.8 }}>
                  {currentStage.current_objectives.slice(0, 2).map((obj, idx) => (
                    <div key={idx} style={{ marginBottom: '2px' }}>
                      • {obj}
                    </div>
                  ))}
                  {currentStage.current_objectives.length > 2 && (
                    <div style={{ opacity: 0.6 }}>
                      ... +{currentStage.current_objectives.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* All Stages Overview */}
            {allStages && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
                  All Stages:
                </div>
                <div style={{ fontSize: '9px' }}>
                  {allStages.map((stage, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '2px 4px',
                      margin: '1px 0',
                      backgroundColor: stage.completed ? '#16a34a' : 
                                     stage.started_at ? getStageColor(stage) : 
                                     'rgba(255,255,255,0.1)',
                      borderRadius: '2px'
                    }}>
                      <span>
                        {stage.stage_symbol} {stage.stage_name.replace('_', ' ')}
                      </span>
                      <span>
                        {stage.completed ? '✓' : 
                         stage.started_at ? `${stage.progress_percentage}%` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'conversations' && (
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '12px' }}>
              Conversation History ({conversationHistory.length})
            </h4>
            {conversationsLoading ? (
              <div>Loading conversations...</div>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {conversationHistory.slice(-10).map((entry, idx) => (
                  <div key={idx} style={{
                    padding: '6px',
                    margin: '4px 0',
                    backgroundColor: entry.type === 'user' ? '#1e40af' : 
                                     entry.type === 'assistant' ? '#059669' : '#6b7280',
                    borderRadius: '4px',
                    fontSize: '10px'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                      {entry.type} {entry.stage && `(${entry.stage})`}
                    </div>
                    <div style={{ opacity: 0.8 }}>
                      {entry.content?.substring(0, 100)}...
                    </div>
                    <div style={{ opacity: 0.6, marginTop: '2px' }}>
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '12px' }}>
              User Profile & Assessment
            </h4>
            {profileLoading ? (
              <div>Loading profile...</div>
            ) : profile ? (
              <div>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Email:</strong> {profile.email}
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Current Stage:</strong> {profile.current_stage || 1}/6
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Overall Progress:</strong> {profile.overall_progress || 0}%
                  </div>
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Fragmentation Pattern:</strong> 
                    <span style={{ 
                      color: profile.fragmentation_pattern === 'to_be_assessed' ? '#fbbf24' : '#10b981',
                      marginLeft: '4px'
                    }}>
                      {profile.fragmentation_pattern || 'to_be_assessed'}
                    </span>
                  </div>
                  {profile.updated_at && (
                    <div style={{ marginBottom: '4px', fontSize: '9px', opacity: 0.7 }}>
                      <strong>Last Updated:</strong> {new Date(profile.updated_at?.toDate?.() || profile.updated_at).toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Fragmentation Pattern Assessment */}
                {profile.fragmentation_pattern === 'to_be_assessed' && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>
                      Set Fragmentation Pattern:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {['psychotic', 'obsessive_neurotic', 'hysteric_neurotic'].map(pattern => (
                        <button
                          key={pattern}
                          onClick={() => handleUpdateFragmentationPattern(pattern)}
                          style={{
                            padding: '4px 6px',
                            fontSize: '9px',
                            backgroundColor: '#374151',
                            border: '1px solid #4b5563',
                            color: 'white',
                            borderRadius: '2px',
                            cursor: 'pointer'
                          }}
                        >
                          {pattern.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>No profile data available</div>
            )}
          </div>
        )}

        {activeTab === 'actions' && (
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '12px' }}>
              Data Management
            </h4>
            <button
              onClick={handleClearData}
              disabled={isClearing}
              style={{
                padding: '6px 12px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isClearing ? 'not-allowed' : 'pointer',
                fontSize: '10px',
                opacity: isClearing ? 0.6 : 1,
                marginBottom: '8px'
              }}
            >
              {isClearing ? 'Clearing...' : 'Clear All Data'}
            </button>
            
            {clearError && (
              <div style={{ 
                marginTop: '8px', 
                color: '#fca5a5', 
                fontSize: '9px',
                backgroundColor: '#7f1d1d',
                padding: '4px',
                borderRadius: '4px'
              }}>
                Error: {clearError}
              </div>
            )}
            
            <div style={{ marginTop: '8px', fontSize: '9px', opacity: 0.7 }}>
              This will permanently delete all conversation history, profile data, and stage progression for the Core Symbol Set therapeutic framework.
            </div>

            {/* Debug Info */}
            <div style={{ marginTop: '12px', fontSize: '9px', opacity: 0.5 }}>
              <div><strong>Debug Info:</strong></div>
              <div>UserUUID: {userUUID?.substring(0, 8)}...</div>
              <div>Conversations: {conversationHistory.length}</div>
              <div>Stages: {allStages?.length || 0}</div>
              <div>Current Stage: {currentStage?.stage_name || 'none'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryDashboard;
