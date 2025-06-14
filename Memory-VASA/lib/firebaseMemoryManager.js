// lib/firebaseMemoryManager.js - Quick fix to avoid index requirement
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';

class FirebaseMemoryManager {
  constructor() {
    try {
      // Use your existing Firebase config from environment variables
      const firebaseConfig = {
        apiKey: process.env.VITE_FIREBASE_API_KEY,
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.VITE_FIREBASE_APP_ID
      };

      console.log('Initializing Firebase with project:', firebaseConfig.projectId);
      
      this.app = initializeApp(firebaseConfig);
      this.db = getFirestore(this.app);
      
      console.log('✅ Firebase Memory Manager initialized successfully');
    } catch (error) {
      console.error('❌ Firebase initialization error:', error);
      throw error;
    }
  }

  async saveConversationMemory(userId, conversationData) {
    try {
      console.log(`💾 Saving conversation memory for user: ${userId}`);
      
      const memoryData = {
        userId,
        agentId: conversationData.agent_id,
        conversationId: conversationData.conversation_id,
        messages: conversationData.messages || [],
        metadata: {
          timestamp: new Date(),
          messageType: conversationData.message_type,
          userMessage: conversationData.message,
          source: 'elevenlabs_webhook',
          // Add therapeutic context if available
          therapeuticContext: conversationData.therapeutic_context || null
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to Firestore 'conversation_memories' collection
      const memoryRef = collection(this.db, 'conversation_memories');
      const docRef = await addDoc(memoryRef, memoryData);

      console.log('✅ Memory saved to Firestore with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error saving memory to Firestore:', error);
      throw error;
    }
  }

  async getConversationHistory(userId, conversationId) {
    try {
      console.log(`🔍 Getting conversation history for user: ${userId}, conversation: ${conversationId}`);
      
      const memoriesRef = collection(this.db, 'conversation_memories');
      
      // Simplified query - just filter by userId and conversationId (no orderBy to avoid index requirement)
      const q = query(
        memoriesRef,
        where('userId', '==', userId),
        where('conversationId', '==', conversationId),
        limit(50)
      );

      const querySnapshot = await getDocs(q);
      const memories = [];
      
      querySnapshot.forEach((doc) => {
        memories.push({
          id: doc.id,
          ...doc.data(),
          // Convert Firestore timestamps to ISO strings
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
          updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
        });
      });

      // Sort in JavaScript instead of Firestore (to avoid index requirement)
      memories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      console.log(`✅ Retrieved ${memories.length} memories from Firestore`);
      return memories.reverse(); // Return in chronological order
    } catch (error) {
      console.error('❌ Error getting conversation history from Firestore:', error);
      throw error;
    }
  }

  async getUserMemories(userId, limitCount = 20) {
    try {
      console.log(`🔍 Getting all memories for user: ${userId}`);
      
      const memoriesRef = collection(this.db, 'conversation_memories');
      
      // SIMPLIFIED QUERY - Just filter by userId (no orderBy to avoid index requirement)
      const q = query(
        memoriesRef,
        where('userId', '==', userId),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const memories = [];
      
      querySnapshot.forEach((doc) => {
        memories.push({
          id: doc.id,
          ...doc.data(),
          // Convert Firestore timestamps to ISO strings  
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
          updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
        });
      });

      // Sort in JavaScript instead of Firestore (to avoid index requirement)
      memories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      console.log(`✅ Retrieved ${memories.length} user memories from Firestore`);
      return memories;
    } catch (error) {
      console.error('❌ Error getting user memories from Firestore:', error);
      throw error;
    }
  }

  async updateMemory(memoryId, updateData) {
    try {
      console.log(`📝 Updating memory: ${memoryId}`);
      
      const memoryRef = doc(this.db, 'conversation_memories', memoryId);
      await updateDoc(memoryRef, {
        ...updateData,
        updatedAt: new Date()
      });

      console.log('✅ Memory updated in Firestore');
      return memoryId;
    } catch (error) {
      console.error('❌ Error updating memory in Firestore:', error);
      throw error;
    }
  }

  async deleteMemory(memoryId) {
    try {
      console.log(`🗑️ Deleting memory: ${memoryId}`);
      
      const memoryRef = doc(this.db, 'conversation_memories', memoryId);
      await deleteDoc(memoryRef);

      console.log('✅ Memory deleted from Firestore');
      return memoryId;
    } catch (error) {
      console.error('❌ Error deleting memory from Firestore:', error);
      throw error;
    }
  }

  // Additional method for therapeutic-specific queries  
  async getTherapeuticSessions(userId, filters = {}) {
    try {
      console.log(`🧠 Getting therapeutic sessions for user: ${userId}`);
      
      const memoriesRef = collection(this.db, 'conversation_memories');
      
      // Simple query to avoid index requirements
      let q = query(
        memoriesRef,
        where('userId', '==', userId),
        limit(50)
      );

      const querySnapshot = await getDocs(q);
      const sessions = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Apply filters in JavaScript instead of Firestore
        let includeDoc = true;
        
        if (filters.therapyStage && 
            data.metadata?.therapeuticContext?.therapy_stage !== filters.therapyStage) {
          includeDoc = false;
        }
        
        if (filters.sessionType && 
            data.metadata?.therapeuticContext?.session_type !== filters.sessionType) {
          includeDoc = false;
        }
        
        if (includeDoc) {
          sessions.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
          });
        }
      });

      // Sort in JavaScript
      sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      console.log(`✅ Retrieved ${sessions.length} therapeutic sessions from Firestore`);
      return sessions;
    } catch (error) {
      console.error('❌ Error getting therapeutic sessions from Firestore:', error);
      throw error;
    }
  }
}

export default new FirebaseMemoryManager();
