
import React, { useState, useCallback, useEffect } from 'react';
import { useConversationMemory, useUserProfile, useDataManagement } from './MemoryHooks.js';

const MemoryDashboard = ({ userUUID, isVisible }) => {
  const [activeTab, setActiveTab] = useState('conversations');
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);

  // Always call hooks - don't conditionally call them
  const { conversationHistory, isLoading: conversationsLoading } = useConversationMemory(userUUID);
  const { profile, isLoading: profileLoading } = useUserProfile(userUUID);
  const { clearUserData, isClearing, clearError } = useDataManagement();

  const handleClearData = useCallback(async () => {
    if (!userUUID) return;

    const confirmed = window.confirm('Are you sure you want to clear all your data? This action cannot be undone.');
    if (confirmed) {
      const success = await clearUserData(userUUID);
      if (success) {
        alert('Data cleared successfully!');
      } else {
        alert(`Failed to clear data: ${clearError || 'Unknown error'}`);
      }
    }
  }, [userUUID, clearUserData, clearError]);

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
    width: isExpanded ? '320px' : '280px',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    border: '1px solid #374151',
    borderRadius: '8px',
    color: 'white',
    fontSize: '11px',
    fontFamily: 'monospace',
    zIndex: 1000,
    cursor: isDragging ? 'grabbing' : 'grab'
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
    maxHeight: isExpanded ? '400px' : '200px',
    overflowY: 'auto'
  };

  return (
    <div style={dashboardStyle}>
      {/* Header */}
      <div 
        style={headerStyle}
        onMouseDown={handleMouseDown}
      >
        <span style={{ fontWeight: 'bold', fontSize: '12px' }}>
          Memory Dashboard
        </span>
        <div>
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
        {['conversations', 'profile', 'actions'].map((tab) => (
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
              User Profile
            </h4>
            {profileLoading ? (
              <div>Loading profile...</div>
            ) : profile ? (
              <div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>UUID:</strong> {userUUID}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Last Updated:</strong> {new Date(profile.lastUpdated).toLocaleString()}
                </div>
                {profile.symbolicIdentity && (
                  <div style={{ marginBottom: '4px' }}>
                    <strong>Identity:</strong> {profile.symbolicIdentity}
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
                opacity: isClearing ? 0.6 : 1
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
              This will permanently delete all conversation history, profile data, and stage progression.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryDashboard;
