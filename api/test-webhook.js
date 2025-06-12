// /api/simple-test.js - No imports, just export
export default function handler(req, res) {
  console.log('Simple test called');
  return res.json({ 
    message: 'Vite + Vercel API test',
    timestamp: new Date().toISOString(),
    status: 'working'
  });
}
