// /api/simple-test.js - Zero dependencies test
export default function handler(req, res) {
  return res.json({ 
    message: 'Ultra simple test works!',
    timestamp: new Date().toISOString(),
    method: req.method
  });
}
