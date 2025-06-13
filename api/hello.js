// /api/hello.js - Minimal test with no dependencies
export default function handler(req, res) {
  res.status(200).json({ message: 'Hello from Vercel!' });
}
