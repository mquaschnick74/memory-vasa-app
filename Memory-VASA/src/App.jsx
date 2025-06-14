import React from 'react'

// Temporarily disabled until we fix ElevenLabs dependency
// import VASAInterface from './VASAInterface'
// import { AppWithProfileGuard } from './guards/AuthProfileGuard.jsx'
// import { getBrowserAuthService } from './services/BrowserAuthService.js'

function App() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#b23cfc',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
        🧠 VASA Memory Interface
      </h1>
      <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
        Build test successful! Ready to integrate your components.
      </p>
      <div style={{ 
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '8px'
      }}>
        <p>✅ React is working</p>
        <p>✅ Build process is working</p>
        <p>⚠️ ElevenLabs dependency needs fixing</p>
        <p>🔧 Ready to add VASA components once deps are resolved</p>
      </div>
      
      <div style={{ 
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.3)'
      }}>
        <h3>Next Steps:</h3>
        <p>1. Fix @elevenlabs/react dependency version</p>
        <p>2. Re-enable VASAInterface import</p>
        <p>3. Deploy with full functionality</p>
      </div>
    </div>
  )
}

export default App
