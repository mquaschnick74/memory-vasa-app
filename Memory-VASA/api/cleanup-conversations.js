// Add this to a new file: /api/cleanup-conversations.js
// This will clear old/wrong conversation data for your user

import admin from 'firebase-admin';

export default async function handler(req, res) {
  const timestamp = new Date().toISOString();
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const USER_UUID = 'NEgpc2haPnU2ZafTt6ECEZZMpcK2';
    const { action } = req.body;
    
    console.log(`[${timestamp}] 🧹 Cleanup action: ${action} for user: ${USER_UUID}`);
    
    const db = admin.firestore();
    
    if (action === 'clear_all_conversations') {
      // Clear ALL conversation history for this user
      const userContextRef = db.collection('users').doc(USER_UUID).collection('user_context');
      const snapshot = await userContextRef.get();
      
      console.log(`[${timestamp}] 📊 Found ${snapshot.size} conversation documents to delete`);
      
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      console.log(`[${timestamp}] ✅ Cleared ${snapshot.size} conversation documents`);
      
      return res.status(200).json({
        success: true,
        action: 'clear_all_conversations',
        deleted_count: snapshot.size,
        user_uuid: USER_UUID,
        timestamp
      });
      
    } else if (action === 'clear_old_conversations') {
      // Clear conversations older than 1 hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const userContextRef = db.collection('users').doc(USER_UUID).collection('user_context');
      const snapshot = await userContextRef.where('timestamp', '<', oneHourAgo.toISOString()).get();
      
      console.log(`[${timestamp}] 📊 Found ${snapshot.size} old conversation documents to delete`);
      
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      return res.status(200).json({
        success: true,
        action: 'clear_old_conversations',
        deleted_count: snapshot.size,
        cutoff_time: oneHourAgo.toISOString(),
        user_uuid: USER_UUID,
        timestamp
      });
      
    } else if (action === 'list_conversations') {
      // Just list what's there without deleting
      const userContextRef = db.collection('users').doc(USER_UUID).collection('user_context');
      const snapshot = await userContextRef.orderBy('timestamp', 'desc').limit(50).get();
      
      const conversations = snapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      }));
      
      return res.status(200).json({
        success: true,
        action: 'list_conversations',
        conversation_count: conversations.length,
        conversations: conversations,
        user_uuid: USER_UUID,
        timestamp
      });
      
    } else {
      return res.status(400).json({ 
        error: 'Invalid action. Use: clear_all_conversations, clear_old_conversations, or list_conversations' 
      });
    }
    
  } catch (error) {
    console.error(`[${timestamp}] ❌ Cleanup error:`, error);
    return res.status(500).json({ 
      error: 'Cleanup failed',
      message: error.message,
      timestamp 
    });
  }
}
