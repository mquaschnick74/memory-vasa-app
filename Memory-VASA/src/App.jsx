import React from 'react'

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
        <p>✅ Ready to add VASA components</p>
      </div>
    </div>
  )
}

export default App
