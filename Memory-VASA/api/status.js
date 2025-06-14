// api/status.js - API status endpoint
export default async function handler(req, res) {
  try {
    // Check environment variables
    const envCheck = {
      openai: !!process.env.OPENAI_API_KEY,
      mem0: !!process.env.MEM0_API_KEY,
      elevenlabs: !!process.env.ELEVENLABS_WEBHOOK_SECRET,
      firebase: !!process.env.VITE_FIREBASE_PROJECT_ID
    };

    const allConfigured = Object.values(envCheck).every(Boolean);

    const status = {
      status: "online",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      services: {
        api: "✅ Online",
        webhook: envCheck.elevenlabs ? "✅ Configured" : "❌ Missing webhook secret",
        mem0: envCheck.mem0 ? "✅ Configured" : "❌ Missing Mem0 API key",
        openai: envCheck.openai ? "✅ Configured" : "❌ Missing OpenAI API key",
        firebase: envCheck.firebase ? "✅ Configured" : "❌ Missing Firebase config"
      },
      endpoints: [
        "POST /api/webhook",
        "POST /api/memory/search", 
        "GET /api/memory/get",
        "POST /api/memory/chat",
        "GET /api/status"
      ],
      configuration: allConfigured ? "✅ Complete" : "⚠️ Incomplete"
    };

    // Set appropriate status code
    const statusCode = allConfigured ? 200 : 206; // 206 = Partial Content

    res.status(statusCode).json(status);

  } catch (error) {
    console.error('Status check error:', error);
    
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        api: "❌ Error"
      }
    });
  }
}
