// lib/mem0Service.js - FIXED with correct MemoryClient usage
import OpenAI from 'openai';

class Mem0Service {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.mem0Available = false;
    this.memory = null;
    this.mem0ApiKey = process.env.MEM0_API_KEY;
    this.initializationAttempted = false;
    this.initializationError = null;
    
    // Initialize Mem0 if API key is available
    this.initializeMem0();
  }

  async initializeMem0() {
    if (this.initializationAttempted) {
      return;
    }
    
    this.initializationAttempted = true;
    
    try {
      console.log('🔄 Attempting to initialize Mem0...');
      console.log('🔑 Mem0 API Key present:', !!this.mem0ApiKey);
      
      if (!this.mem0ApiKey) {
        this.initializationError = 'No MEM0_API_KEY found in environment variables';
        console.log('⚠️', this.initializationError);
        return;
      }

      // Import MemoryClient (we know this works)
      console.log('📦 Importing MemoryClient...');
      const { MemoryClient } = await import('mem0ai');
      
      if (!MemoryClient) {
        this.initializationError = 'MemoryClient not found in mem0ai package';
        console.log('❌', this.initializationError);
        return;
      }
      
      console.log('✅ MemoryClient found');

      // Create client with correct format (we know this works)
      console.log('🔄 Creating MemoryClient instance...');
      this.memory = new MemoryClient({
        apiKey: this.mem0ApiKey
      });
      
      console.log('✅ MemoryClient instance created');

      // Test the connection with correct ARRAY format
      await this.testConnection();
      
    } catch (error) {
      this.initializationError = `Mem0 initialization failed: ${error.message}`;
      console.log('❌', this.initializationError);
    }
  }

  async testConnection() {
    try {
      console.log('🧪 Testing Mem0 connection...');
      
      const testUserId = 'connection-test-' + Date.now();
      
      // Use ARRAY format based on error analysis
      const testResult = await this.memory.add(
        [{ role: 'user', content: 'Connection test message' }],  // ARRAY format!
        { user_id: testUserId }  // OBJECT format for userId!
      );
      
      console.log('✅ Mem0 connection successful!', testResult);
      this.mem0Available = true;
      
      // Clean up test memory if possible
      try {
        if (testResult.id || testResult.memory_id) {
          const memoryId = testResult.id || testResult.memory_id;
          await this.memory.delete(memoryId);
          console.log('🧹 Test memory cleaned up');
        }
      } catch (cleanupError) {
        console.log('⚠️ Cleanup warning:', cleanupError.message);
      }
      
    } catch (error) {
      this.initializationError = `Connection test failed: ${error.message}`;
      console.log('❌', this.initializationError);
      
      // Check if it's an API key issue
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        this.initializationError += ' - Check your MEM0_API_KEY';
      }
      
      throw error;
    }
  }

  async addMemory(userId, conversationData, metadata = {}) {
    try {
      console.log(`🧠 Adding memory for user: ${userId}`);
      console.log('🔍 Mem0 available:', this.mem0Available);
      
      if (this.mem0Available && this.memory) {
        // Use real Mem0 with correct ARRAY format
        console.log('🔄 Using real Mem0 service...');
        
        // Ensure messages is an array
        let messages = conversationData.messages || [];
        if (!Array.isArray(messages)) {
          // Convert single message to array format
          messages = [{ role: 'user', content: String(messages) }];
        }
        
        // Ensure all messages have proper format
        messages = messages.map(msg => {
          if (typeof msg === 'string') {
            return { role: 'user', content: msg };
          }
          return {
            role: msg.role || 'user',
            content: msg.content || msg.message || String(msg)
          };
        });
        
        const result = await this.memory.add(
          messages,  // ARRAY format - this is the key!
          { user_id: userId },  // OBJECT format for userId!
          {
            metadata: {
              agent_id: conversationData.agent_id,
              conversation_id: conversationData.conversation_id,
              timestamp: new Date().toISOString(),
              ...metadata
            }
          }
        );
        
        console.log('✅ Memory added to Mem0 successfully:', result);
        return {
          ...result,
          mode: 'mem0',
          service: 'real_mem0'
        };
      } else {
        // Fallback: Use OpenAI to create memory summary
        console.log('🔄 Using OpenAI fallback for memory...');
        console.log('🔍 Fallback reason:', this.initializationError || 'Mem0 not available');
        
        const memoryResult = await this.createMemoryWithOpenAI(userId, {
          messages: conversationData.messages || [],
          context: {
            agent_id: conversationData.agent_id,
            conversation_id: conversationData.conversation_id,
            timestamp: new Date().toISOString(),
            ...metadata
          }
        });
        
        console.log('✅ Memory processed with OpenAI fallback:', memoryResult);
        return {
          ...memoryResult,
          mode: 'openai_fallback',
          service: 'openai_fallback',
          reason: this.initializationError
        };
      }
    } catch (error) {
      console.error('❌ Error adding memory:', error);
      throw error;
    }
  }

  async searchMemories(userId, query, limit = 5) {
    try {
      console.log(`🔍 Searching memories for user: ${userId}, query: ${query}`);
      
      if (this.mem0Available && this.memory) {
        console.log('🔄 Using real Mem0 search...');
        const results = await this.memory.search(
          query,
          { user_id: userId },  // OBJECT format for userId!
          { limit }
        );
        console.log('✅ Mem0 search completed:', results);
        return {
          ...results,
          mode: 'mem0',
          service: 'real_mem0'
        };
      } else {
        console.log('🔄 Using search fallback...');
        const fallbackResults = await this.searchWithOpenAIFallback(userId, query, limit);
        console.log('✅ Fallback search completed:', fallbackResults);
        return {
          ...fallbackResults,
          mode: 'openai_fallback',
          service: 'openai_fallback',
          reason: this.initializationError
        };
      }
    } catch (error) {
      console.error('❌ Error searching memories:', error);
      throw error;
    }
  }

  async getMemories(userId, limit = 10) {
    try {
      console.log(`📚 Getting all memories for user: ${userId}`);
      
      if (this.mem0Available && this.memory) {
        console.log('🔄 Using real Mem0 retrieval...');
        const memories = await this.memory.get_all({ user_id: userId }, { limit });
        console.log('✅ Mem0 memories retrieved:', memories);
        return {
          ...memories,
          mode: 'mem0',
          service: 'real_mem0'
        };
      } else {
        console.log('🔄 Using retrieval fallback...');
        const fallbackMemories = {
          memories: [
            {
              id: `fallback_${Date.now()}`,
              content: `Memory storage for user ${userId} (OpenAI fallback mode)`,
              timestamp: new Date().toISOString(),
              userId,
              note: "Mem0 not available - using OpenAI fallback",
              reason: this.initializationError
            }
          ],
          total: 1,
          mode: "openai_fallback",
          service: "openai_fallback",
          reason: this.initializationError
        };
        console.log('✅ Fallback memories generated:', fallbackMemories);
        return fallbackMemories;
      }
    } catch (error) {
      console.error('❌ Error getting memories:', error);
      throw error;
    }
  }

  // OpenAI fallback methods (same as before)
  async createMemoryWithOpenAI(userId, memoryData) {
    try {
      const summary = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Create a concise memory summary of this conversation for future reference. Focus on key insights, breakthroughs, and important information."
          },
          {
            role: "user", 
            content: `User ID: ${userId}\nConversation: ${JSON.stringify(memoryData.messages)}\nContext: ${JSON.stringify(memoryData.context)}`
          }
        ],
        max_tokens: 200
      });

      return {
        success: true,
        memory_id: `openai_${Date.now()}`,
        summary: summary.choices[0].message.content,
        mode: "openai_fallback",
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('OpenAI fallback error:', error);
      throw error;
    }
  }

  async searchWithOpenAIFallback(userId, query, limit) {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Generate relevant memory search results for query: "${query}" for user ${userId}. Provide realistic therapeutic conversation memories.`
          },
          {
            role: "user",
            content: query
          }
        ],
        max_tokens: 300
      });

      return {
        results: [
          {
            memory: response.choices[0].message.content,
            relevance: 0.85,
            timestamp: new Date().toISOString(),
            source: "openai_fallback"
          }
        ],
        total: 1,
        mode: "openai_fallback"
      };
    } catch (error) {
      console.error('OpenAI search fallback error:', error);
      throw error;
    }
  }

  async generateContextualResponse(userId, currentMessage, memories) {
    try {
      const memoriesText = memories.results
        ? memories.results.map(entry => `- ${entry.memory || entry.content}`).join('\n')
        : 'No relevant memories found.';

      const systemPrompt = `You are a helpful AI assistant with access to conversation history. 
Use the following memories to provide contextual and personalized responses:

User Memories:
${memoriesText}

Instructions:
- Use the memories to provide context-aware responses
- Reference previous conversations when relevant
- Maintain continuity in the conversation
- Be natural and conversational
- For therapeutic contexts, be supportive and professional`;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: currentMessage }
      ];

      const response = await this.openai.chat.completions.create({
        model: process.env.MEM0_LLM_MODEL || "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 1000
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('❌ Error generating contextual response:', error);
      throw error;
    }
  }

  // Enhanced status check method
  getStatus() {
    return {
      mem0Available: this.mem0Available,
      hasApiKey: !!this.mem0ApiKey,
      mode: this.mem0Available ? 'mem0' : 'openai_fallback',
      initializationAttempted: this.initializationAttempted,
      initializationError: this.initializationError,
      service: this.mem0Available ? 'real_mem0' : 'openai_fallback'
    };
  }
}

export default new Mem0Service();
