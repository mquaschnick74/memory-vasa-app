// File: Memory-VASA/api/webhook.js - Ultra-simple version

import admin from 'firebase-admin';

// Initialize Firebase Admin (only if not already initialized)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: `https://${process.env.VITE_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com/`
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

export default async function handler(req, res) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ========== 11LABS WEBHOOK REQUEST ==========`);
  console.log(`[${timestamp}] Method: ${req.method}`);
  console.log(`[${timestamp}] Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`[${timestamp}] Body:`, JSON.stringify(req.body, null, 2));

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-elevenlabs-signature, x-elevenlabs-timestamp');

  if (req.method === 'OPTIONS') {
    console.log(`[${timestamp}] Handling OPTIONS preflight request`);
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    console.log(`[${timestamp}] ❌ Method not allowed: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract what we can from the request
    const { action } = req.body;
    
    console.log(`[${timestamp}] 📊 Processing simple webhook request`);
    console.log(`[${timestamp}] Action: ${action || 'UNDEFINED'}`);

    // Use your current user UUID (hardcoded for now)
    const CURRENT_USER_UUID = 'AVs5XlU6qQezh8GiNlRwN6UEfjM2';
    
    console.log(`[${timestamp}] 👤 Using user UUID: ${CURRENT_USER_UUID}`);

    // Get conversation history from Firestore
    let conversationHistory = [];
    try {
      console.log(`[${timestamp}] 🔍 Getting conversation history from Firestore...`);
      
      const db = admin.firestore();
      const userContextRef = db.collection('users').doc(CURRENT_USER_UUID).collection('user_context');
      const snapshot = await userContextRef.orderBy('timestamp', 'asc').limit(10).get();
      
      conversationHistory = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          type: data.type || 'unknown',
          content: data.content || '',
          timestamp: data.timestamp || '',
          stage: data.stage || ''
        };
      });
      
      console.log(`[${timestamp}] 📚 Retrieved ${conversationHistory.length} messages from Firestore`);
      
    } catch (firestoreError) {
      console.error(`[${timestamp}] ❌ Firestore error:`, firestoreError);
      conversationHistory = [];
    }

    // Generate context summary
    const contextSummary = generateContextSummary(conversationHistory);
    
    // Prepare simple response
    const responseData = {
      success: true,
      user_uuid: CURRENT_USER_UUID,
      context: conversationHistory,
      context_summary: contextSummary,
      timestamp: timestamp,
      webhook_status: 'SIMPLE_WEBHOOK_SUCCESS',
      conversation_count: conversationHistory.length
    };

    console.log(`[${timestamp}] ✅ Simple webhook processed successfully`);
    console.log(`[${timestamp}] 📊 Returning ${conversationHistory.length} messages`);
    
    return res.status(200).json(responseData);

  } catch (error) {
    console.error(`[${timestamp}] ❌ Webhook error:`, error);
    
    // Always return success to prevent agent termination
    const safeResponse = {
      success: true,
      user_uuid: 'AVs5XlU6qQezh8GiNlRwN6UEfjM2',
      context: [],
      context_summary: 'No previous conversation history available.',
      timestamp: timestamp,
      webhook_status: 'ERROR_HANDLED_SAFELY'
    };
    
    console.log(`[${timestamp}] 🛡️ Returning safe fallback response`);
    return res.status(200).json(safeResponse);
  }
}

// Generate context summary
function generateContextSummary(history) {
  if (!history || history.length === 0) {
    return 'Starting a new therapeutic session.';
  }
  
  const userMessages = history
    .filter(msg => msg.type === 'user' && msg.content?.trim().length > 0)
    .slice(-2);
  
  if (userMessages.length === 0) {
    return 'Continuing from previous session - ready to engage.';
  }
  
  const recentTopics = userMessages.map(msg => 
    `"${msg.content?.substring(0, 50)}"`
  ).join(', ');
    
  return `Recent topics from ${history.length} messages: ${recentTopics}`;
}
