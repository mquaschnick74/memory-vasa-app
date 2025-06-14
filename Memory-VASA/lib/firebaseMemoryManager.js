// lib/firebaseMemoryManager.js
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, limit } from 'firebase/firestore';
import firebaseConfig from '../server/firebase-config.js';

class FirebaseMemoryManager {
  constructor() {
    this.app = initializeApp(firebaseConfig);
    this.db = getFirestore(this.app);
  }

  async saveConversationMemory(userId, conversationData) {
    try {
      console.log(`Saving conversation memory for user: ${userId}`);
      
      const memoryRef = collection(this.db, 'memories');
      const docRef = await addDoc(memoryRef, {
        userId,
        agentId: conversationData.agent_id,
        conversationId: conversationData.conversation_id,
        messages: conversationData.messages || [],
        metadata: {
          timestamp: new Date(),
          messageType: conversationData.message_type,
          userMessage: conversationData.message,
          source: 'elevenlabs_webhook'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log('Memory saved to Firebase:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error saving memory to Firebase:', error);
      throw error;
    }
  }

  async getConversationHistory(userId, conversationId) {
    try {
      console.log(`Getting conversation history for user: ${userId}, conversation: ${conversationId}`);
      
      const memoriesRef = collection(this.db, 'memories');
      const q = query(
        memoriesRef,
        where('userId', '==', userId),
        where('conversationId', '==', conversationId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const querySnapshot = await getDocs(q);
      const memories = [];
      
      querySnapshot.forEach((doc) => {
        memories.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`Retrieved ${memories.length} memories from Firebase`);
      return memories.reverse(); // Return in chronological order
    } catch (error) {
      console.error('Error getting conversation history:', error);
      throw error;
    }
  }

  async getUserMemories(userId, limitCount = 20) {
    try {
      console.log(`Getting all memories for user: ${userId}`);
      
      const memoriesRef = collection(this.db, 'memories');
      const q = query(
        memoriesRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const memories = [];
      
      querySnapshot.forEach((doc) => {
        memories.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`Retrieved ${memories.length} user memories from Firebase`);
      return memories;
    } catch (error) {
      console.error('Error getting user memories:', error);
      throw error;
    }
  }

  async updateMemory(memoryId, updateData) {
    try {
      console.log(`Updating memory: ${memoryId}`);
      
      const memoryRef = doc(this.db, 'memories', memoryId);
      await updateDoc(memoryRef, {
        ...updateData,
        updatedAt: new Date()
      });

      console.log('Memory updated in Firebase');
      return memoryId;
    } catch (error) {
      console.error('Error updating memory in Firebase:', error);
      throw error;
    }
  }

  async deleteMemory(memoryId) {
    try {
      console.log(`Deleting memory: ${memoryId}`);
      
      const memoryRef = doc(this.db, 'memories', memoryId);
      await deleteDoc(memoryRef);

      console.log('Memory deleted from Firebase');
      return memoryId;
    } catch (error) {
      console.error('Error deleting memory from Firebase:', error);
      throw error;
    }
  }
}

export default new FirebaseMemoryManager();
