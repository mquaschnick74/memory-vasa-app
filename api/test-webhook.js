// /api/test-webhook.js - Simple test endpoint
export default async function handler(req, res) {
  console.log('🔔 Test endpoint working!');
  
  return res.json({ 
    message: 'API is deployed and working!', 
    timestamp: new Date().toISOString(),
    method: req.method,
    status: 'success'
  });
}
