// api/webhook.js - Fixed webhook with proper signature validation
import mem0Service from '../lib/mem0Service.js';
import crypto from 'crypto';

export default async function handler(req, res) {
  // Allow GET requests for testing/health checks
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'Webhook endpoint active',
      timestamp: new Date().toISOString(),
      mem0Status: mem0Service.getStatus()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📥 Webhook received');
    console.log('Headers:', req.headers);
    
    // Optional webhook signature validation
    const webhookSecret = process.env.WEBHOOK_SECRET;
    
    if (webhookSecret) {
      const signature = req.headers['x-signature'] || req.headers['x-hub-signature-256'] || req.headers['signature'];
      
      if (signature) {
        // Validate webhook signature
        const isValid = validateWebhookSignature(req.body, signature, webhookSecret);
        
        if (!isValid) {
          console.log('❌ Invalid webhook signature');
          return res.status(401).json({ error: 'Invalid webhook signature' });
        }
        
        console.log('✅ Webhook signature validated');
      } else {
        console.log('⚠️ No signature provided, but secret is configured');
      }
    } else {
      console.log('ℹ️ No webhook secret configured, skipping signature validation');
    }

    const { userId, conversationData, action = 'add', message, query, limit } = req.body;
    
    console.log(`📥 Webhook processed - Action: ${action}, User: ${userId}`);
    
    switch (action) {
      case 'add':
        if (!userId || !conversationData) {
          return res.status(400).json({ error: 'Missing userId or conversationData' });
        }
        
        const memoryResult = await mem0Service.addMemory(userId, conversationData);
        console.log('✅ Memory added via webhook:', memoryResult);
        
        return res.status(200).json({
          success: true,
          message: 'Memory added successfully',
          memory: memoryResult,
          mode: memoryResult.mode || 'unknown'
        });
        
      case 'search':
        if (!userId || !query) {
          return res.status(400).json({ error: 'Missing userId or query' });
        }
        
        const searchResults = await mem0Service.searchMemories(userId, query, limit || 5);
        
        return res.status(200).json({
          success: true,
          memories: searchResults,
          count: searchResults.results?.length || searchResults.memories?.length || 0
        });
        
      case 'context':
        if (!userId || !message) {
          return res.status(400).json({ error: 'Missing userId or message' });
        }
        
        const memories = await mem0Service.searchMemories(userId, message, 5);
        const contextualResponse = await mem0Service.generateContextualResponse(
          userId, 
          message, 
          memories
        );
        
        return res.status(200).json({
          success: true,
          response: contextualResponse,
          memories_used: memories.results?.length || memories.memories?.length || 0,
          mode: memories.mode || 'unknown'
        });
        
      case 'status':
        const status = mem0Service.getStatus();
        return res.status(200).json({
          success: true,
          status,
          timestamp: new Date().toISOString()
        });
        
      default:
        return res.status(400).json({ error: `Invalid action: ${action}` });
    }
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

function validateWebhookSignature(payload, signature, secret) {
  try {
    // Handle different signature formats
    let sig = signature;
    
    // Remove 'sha256=' prefix if present
    if (sig.startsWith('sha256=')) {
      sig = sig.substring(7);
    }
    
    // Calculate expected signature
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
    
    // Compare signatures
    return crypto.timingSafeEqual(
      Buffer.from(sig, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}
