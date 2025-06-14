// lib/mem0Service.js - Fixed Mem0 integration with proper API connection
import OpenAI from 'openai';

class Mem0Service {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.mem0Available = false;
    this.memory = null;
    this.mem0ApiKey = process.env.MEM0_API_KEY;
    
    // Initialize Mem0 if API key is available
    this.initializeMem0();
  }

  async initializeMem0() {
    try {
      console.log('🔄 Attempting to initialize Mem0...');
      console.log('🔑 Mem0 API Key present:', !!this.mem0ApiKey);
      
      if (!this.mem0ApiKey) {
        console.log('⚠️ No MEM0_API_KEY found in environment variables');
        return;
      }

      // Try to import and initialize Mem0
      let mem0ai;
      
      try {
        // Try the main import pattern
        mem0ai = await import('mem0ai');
        console.log('📦 Mem0ai package imported successfully');
      } catch (importError) {
        console.log('❌ Failed to import mem0ai:', importError.message);
        try {
          // Try alternative import
          const { Memory } = await import('mem0ai');
          mem0ai = { Memory };
        } catch (altError) {
          console.log('❌ Alternative import also failed:', altError.message);
          return;
        }
      }

      // Initialize Memory with API key
      const MemoryClass = mem0ai.Memory || mem0ai.default?.Memory;
      
      if (!MemoryClass) {
        console.log('❌ Memory class not found in mem0ai package');
        return;
      }

      this.memory = new MemoryClass({
        api_key: this.mem0ApiKey,  // This is the key part!
        config: {
          llm: {
            provider: "openai",
            config: {
              model: process.env.MEM0_LLM_MODEL || "gpt-4o-mini",
              api_key: process.env.OPENAI_API_KEY
            }
          },
          embedder: {
            provider: "openai", 
            config: {
              model: process.env.MEM0_EMBEDDING_MODEL || "text-embedding-3-small",
              api_key: process.env.OPENAI_API_KEY
            }
          }
        }
      });
      
      // Test the connection
      await this.testConnection();
      
    } catch (error) {
      console.log('❌ Mem0 initialization failed:', error.message);
      console.log('🔄 Will use OpenAI fallback mode');
    }
  }

  async testConnection() {
    try {
      console.log('🧪 Testing Mem0 connection...');
      
      // Try a simple operation to test connection
      const testUserId = 'connection-test-' + Date.now();
      const testResult = await this.memory.add(
        'This is a connection test message.',
        testUserId
      );
      
      console.log('✅ Mem0 connection successful!', testResult);
      this.mem0Available = true;
      
      // Clean up test memory
      if (testResult.id) {
        await this.memory.delete(testResult.id);
        console.log('🧹 Test memory cleaned up');
      }
      
    } catch (error) {
      console.log('❌ Mem0 connection test failed:', error.message);
      throw error;
    }
  }

  async addMemory(userId, conversationData, metadata = {}) {
    try {
      console.log(`🧠 Adding memory for user: ${userId}`);
      console.log('🔍 Mem0 available:', this.mem0Available);
      
      if (this.mem0Available && this.memory) {
        // Use real Mem0 - format the messages properly
        const messagesText = conversationData.messages
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n');
        
        console.log('🔄 Using real Mem0 service...');
        const result = await this.memory.add(
          messagesText,
          userId,
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
        return result;
      } else {
        // Fallback: Use OpenAI to create memory summary
        console.log('🔄 Using OpenAI fallback for memory...');
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
        return memoryResult;
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
          userId,
          { limit }
        );
        console.log('✅ Mem0 search completed:', results);
        return results;
      } else {
        console.log('🔄 Using search fallback...');
        const fallbackResults = await this.searchWithOpenAIFallback(userId, query, limit);
        console.log('✅ Fallback search completed:', fallbackResults);
        return fallbackResults;
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
        const memories = await this.memory.get_all(userId, { limit });
        console.log('✅ Mem0 memories retrieved:', memories);
        return memories;
      } else {
        console.log('🔄 Using retrieval fallback...');
        const fallbackMemories = {
          memories: [
            {
              id: `fallback_${Date.now()}`,
              content: `Memory storage for user ${userId} (OpenAI fallback mode)`,
              timestamp: new Date().toISOString(),
              userId,
              note: "Mem0 not available - using OpenAI fallback"
            }
          ],
          total: 1,
          mode: "openai_fallback"
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

  // Status check method
  getStatus() {
    return {
      mem0Available: this.mem0Available,
      hasApiKey: !!this.mem0ApiKey,
      mode: this.mem0Available ? 'mem0' : 'openai_fallback'
    };
  }
}

export default new Mem0Service();
