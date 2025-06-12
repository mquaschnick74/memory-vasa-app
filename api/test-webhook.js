// /api/test-webhook.js - Simple test endpoint
export default async function handler(req, res) {
  console.log('🔔 Test webhook called:', req.method);
  
  if (req.method === 'GET') {
    return res.json({ 
      message: 'Test webhook is working!', 
      timestamp: new Date().toISOString(),
      method: req.method
    });
  }
  
  if (req.method === 'POST') {
    console.log('📝 POST body:', req.body);
    return res.json({ 
      message: 'POST webhook received!', 
      body: req.body,
      timestamp: new Date().toISOString()
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
