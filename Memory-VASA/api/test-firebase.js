// api/test-firebase.js - Vercel Serverless Function

import { getFirebaseDb, testFirebaseConnection } from '../server/firebase-config.js';

export default async function handler(req, res) {
  const requestId = Math.random().toString(36).substr(2, 9);
  
  console.log(`[${requestId}] Firebase test API called`);
  console.log(`[${requestId}] Method: ${req.method}`);
  console.log(`[${requestId}] Environment: ${process.env.NODE_ENV}`);
  console.log(`[${requestId}] Vercel: ${!!process.env.VERCEL}`);
  
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    console.log(`[${requestId}] ❌ Method not allowed: ${req.method}`);
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowedMethods: ['GET'],
      requestId 
    });
  }

  try {
    console.log(`[${requestId}] Testing Firebase Admin connection...`);
    
    // Test basic Firebase initialization
    console.log(`[${requestId}] Getting Firebase Admin DB instance...`);
    const db = getFirebaseDb();
    console.log(`[${requestId}] Firebase Admin DB instance obtained:`, !!db);
    
    // Run comprehensive connection test
    console.log(`[${requestId}] Running Admin SDK connection test...`);
    const connectionTest = await testFirebaseConnection();
    console.log(`[${requestId}] Connection test result:`, connectionTest);
    
    if (connectionTest.success) {
      console.log(`[${requestId}] ✅ Firebase Admin test completed successfully`);
      
      return res.status(200).json({
        success: true,
        message: 'Firebase Admin SDK connection successful',
        details: {
          canRead: connectionTest.canRead,
          canWrite: connectionTest.canWrite,
          testDocumentId: connectionTest.testDocId,
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'unknown',
          serverSide: true,
          adminSDK: true,
          vercel: !!process.env.VERCEL,
          requestId
        }
      });
    } else {
      console.error(`[${requestId}] ❌ Firebase Admin connection test failed`);
      
      return res.status(500).json({
        success: false,
        error: 'Firebase Admin connection failed',
        details: {
          errorMessage: connectionTest.error,
          errorCode: connectionTest.code,
          serverSide: true,
          adminSDK: true,
          requestId
        }
      });
    }
    
  } catch (error) {
    console.error(`[${requestId}] ❌ Firebase test API error:`, {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Provide specific error messages based on error type
    let errorMessage = 'Firebase Admin SDK initialization failed';
    let statusCode = 500;
    
    if (error.message.includes('window is not defined')) {
      errorMessage = 'Server-side code issue - browser code detected in server environment';
      statusCode = 500;
    } else if (error.message.includes('service account')) {
      errorMessage = 'Invalid Firebase service account credentials';
      statusCode = 500;
    } else if (error.message.includes('project')) {
      errorMessage = 'Firebase project configuration error';
      statusCode = 500;
    } else if (error.message.includes('environment variables')) {
      errorMessage = 'Missing Firebase environment variables';
      statusCode = 500;
    } else if (error.message.includes('Parse error')) {
      errorMessage = 'Invalid JSON in FIREBASE_SERVICE_ACCOUNT_KEY';
      statusCode = 500;
    }
    
    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: {
        code: error.code,
        message: error.message,
        serverSide: true,
        adminSDK: true,
        requestId,
        // Only include stack in development
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
}
