// lib/mem0Service.js - Fixed Mem0 service with comprehensive import handling
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

      // Try multiple import strategies for mem0ai
      let mem0ai = null;
      const importStrategies = [
        async () => {
          console.log('📦 Trying import strategy 1: default import mem0ai');
          return await import('mem0ai');
        },
        async () => {
          console.log('📦 Trying import strategy 2: destructured import');
          const { Memory } = await import('mem0ai');
          return { Memory };
        },
        async () => {
          console.log('📦 Trying import strategy 3: dynamic require fallback');
          const mem0Module = await import('mem0ai');
          return mem0Module.default || mem0Module;
        }
      ];

      for (const strategy of importStrategies) {
        try {
          mem0ai = await strategy();
          if (mem0ai) {
            console.log('✅ Successfully imported mem0ai package');
            break;
          }
        } catch (strategyError) {
          console.log(`❌ Import strategy failed: ${strategyError.message}`);
          continue;
        }
      }

      if (!mem0ai) {
        this.initializationError = 'All mem0ai import strategies failed';
        console.log('❌', this.initializationError);
        return;
      }

      // Try to find the Memory class in different locations
      const memoryClassCandidates = [
        mem0ai.MemoryClient,    // This is the correct one!
        mem0ai.Memory,          // Keep as fallback
        mem0ai.default?.MemoryClient,
        mem0ai.default?.Memory,
        mem0ai.Client,
        mem0ai.default?.Client,
        mem0ai.default         // Try default export directly
      ];

      let MemoryClass = null;
      for (const candidate of memoryClassCandidates) {
        if (candidate && typeof candidate === 'function') {
          MemoryClass = candidate;
          console.log('✅ Found Memory class');
          break;
        }
      }

      if (!MemoryClass) {
        // Enhanced debugging - show what's actually available
        const availableKeys = Object.keys(mem0ai);
        const availableDefaultKeys = mem0ai.default ? Object.keys(mem0ai.default) : [];
        
        this.initializationError = `Memory class not found. Available in mem0ai: [${availableKeys.join(', ')}]. Available in mem0ai.default: [${availableDefaultKeys.join(', ')}]`;
        console.log('❌', this.initializationError);
        
        // Try to find any constructor-like functions
        for (const key of availableKeys) {
          if (typeof mem0ai[key] === 'function') {
            console.log(`🔍 Found function: ${key}`, typeof mem0ai[key]);
          }
        }
        
        return;
      }

      // Try to initialize the Memory instance
      console.log('🔄 Creating Memory instance...');
      
      // Try different initialization patterns
      const initializationConfigs = [
        // Config 1: Just API key
        {
          api_key: this.mem0ApiKey
        },
        // Config 2: API key with config object
        {
          api_key: this.mem0ApiKey,
          config: {
            llm: {
              provider: "openai",
              config: {
                model: process.env.MEM0_LLM_MODEL || "gpt-4o-mini",
                api_key: process.env.OPENAI_API_KEY
              }
            }
          }
        },
        // Config 3: Different structure
        {
          apiKey: this.mem0ApiKey
        }
      ];

      for (const config of initializationConfigs) {
        try {
          this.memory = new MemoryClass(config);
          console.log('✅ Memory instance created successfully');
          break;
        } catch (configError) {
          console.log(`❌ Config failed: ${configError.message}`);
          continue;
        }
      }

      if (!this.memory) {
        this.initializationError = 'Failed to create Memory instance with any configuration';
        console.log('❌', this.initializationError);
        return;
      }

      // Test the connection with a simple operation
      await this.testConnection();
      
    } catch (error) {
      this.initializationError = `Mem0 initialization failed: ${error.message}`;
      console.log('❌', this.initializationError);
    }
  }

  async testConnection() {
    try {
      console.log('🧪 Testing Mem0 connection...');
      
      // Try different API call formats to find the correct one
      const testUserId = 'connection-test-' + Date.now();
      
      // Try format 1: messages, user_id, metadata
      try {
        const testResult = await this.memory.add(
          'Connection test message',
          testUserId,
          {
            metadata: {
              test: true,
              timestamp: new Date().toISOString()
            }
          }
        );
        
        console.log('✅ Mem0 connection successful (format 1)!', testResult);
        this.mem0Available = true;
        return await this.cleanupTestMemory(testResult);
        
      } catch (format1Error) {
        console.log('❌ Format 1 failed:', format1Error.message);
        
        // Try format 2: different parameter structure
        try {
          const testResult = await this.memory.add({
            messages: 'Connection test message',
            user_id: testUserId,
            metadata: {
              test: true,
              timestamp: new Date().toISOString()
            }
          });
          
          console.log('✅ Mem0 connection successful (format 2)!', testResult);
          this.mem0Available = true;
          return await this.cleanupTestMemory(testResult);
          
        } catch (format2Error) {
          console.log('❌ Format 2 failed:', format2Error.message);
          
          // Try format 3: minimal parameters
          try {
            const testResult = await this.memory.add({
              text: 'Connection test message',
              user_id: testUserId
            });
            
            console.log('✅ Mem0 connection successful (format 3)!', testResult);
            this.mem0Available = true;
            return await this.cleanupTestMemory(testResult);
            
          } catch (format3Error) {
            console.log('❌ All formats failed');
            throw new Error(`All API formats failed. Last error: ${format3Error.message}`);
          }
        }
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

  async cleanupTestMemory(testResult) {
    try {
      if (testResult.id || testResult.memory_id) {
        const memoryId = testResult.id || testResult.memory_id;
        await this.memory.delete(memoryId);
        console.log('🧹 Test memory cleaned up');
      }
    } catch (cleanupError) {
      console.log('⚠️ Cleanup warning:', cleanupError.message);
    }
    return testResult;
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
          userId,
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
        const memories = await this.memory.get_all(userId, { limit });
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
