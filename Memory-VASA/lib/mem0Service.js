// lib/mem0Service.js
import mem0ai from 'mem0ai';
import OpenAI from 'openai';

class Mem0Service {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Use the correct mem0ai initialization
    this.memory = new mem0ai.Memory({
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
  }

  async addMemory(userId, conversationData, metadata = {}) {
    try {
      console.log(`Adding memory for user: ${userId}`);
      
      const memoryData = {
        messages: conversationData.messages || [],
        context: {
          agent_id: conversationData.agent_id,
          conversation_id: conversationData.conversation_id,
          timestamp: new Date().toISOString(),
          ...metadata
        }
      };

      const result = await this.memory.add(
        memoryData.messages,
        userId,
        {
          metadata: memoryData.context
        }
      );

      console.log('Memory added successfully:', result);
      return result;
    } catch (error) {
      console.error('Error adding memory:', error);
      throw error;
    }
  }

  async searchMemories(userId, query, limit = 5) {
    try {
      console.log(`Searching memories for user: ${userId}, query: ${query}`);
      
      const results = await this.memory.search(
        query,
        userId,
        { limit }
      );

      console.log('Memory search results:', results);
      return results;
    } catch (error) {
      console.error('Error searching memories:', error);
      throw error;
    }
  }

  async getMemories(userId, limit = 10) {
    try {
      console.log(`Getting all memories for user: ${userId}`);
      
      const memories = await this.memory.get_all(userId, { limit });
      
      console.log('Retrieved memories:', memories);
      return memories;
    } catch (error) {
      console.error('Error getting memories:', error);
      throw error;
    }
  }

  async updateMemory(memoryId, newData) {
    try {
      console.log(`Updating memory: ${memoryId}`);
      
      const result = await this.memory.update(memoryId, newData);
      
      console.log('Memory updated successfully:', result);
      return result;
    } catch (error) {
      console.error('Error updating memory:', error);
      throw error;
    }
  }

  async deleteMemory(memoryId) {
    try {
      console.log(`Deleting memory: ${memoryId}`);
      
      const result = await this.memory.delete(memoryId);
      
      console.log('Memory deleted successfully:', result);
      return result;
    } catch (error) {
      console.error('Error deleting memory:', error);
      throw error;
    }
  }

  async generateContextualResponse(userId, currentMessage, memories) {
    try {
      const memoriesText = memories.results
        ? memories.results.map(entry => `- ${entry.memory}`).join('\n')
        : 'No relevant memories found.';

      const systemPrompt = `You are a helpful AI assistant with access to conversation history. 
Use the following memories to provide contextual and personalized responses:

User Memories:
${memoriesText}

Instructions:
- Use the memories to provide context-aware responses
- Reference previous conversations when relevant
- Maintain continuity in the conversation
- Be natural and conversational`;

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
      console.error('Error generating contextual response:', error);
      throw error;
    }
  }
}

export default new Mem0Service();
