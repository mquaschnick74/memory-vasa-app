// lib/db.js
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';

// ============================================================================
// VASA MEMORY / CONVERSATIONS
// ============================================================================

export const addConversation = async (userUUID, conversationData) => {
  try {
    const docRef = await addDoc(collection(db, 'conversations'), {
      userUUID,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
      ...conversationData
    });
    console.log('✅ Conversation added with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error adding conversation:', error);
    throw error;
  }
};

export const getUserConversations = async (userUUID) => {
  try {
    const q = query(
      collection(db, 'conversations'),
      where('userUUID', '==', userUUID),
      orderBy('timestamp', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    throw error;
  }
};

// ============================================================================
// USER PROFILES
// ============================================================================

export const createOrUpdateUserProfile = async (userUUID, profileData) => {
  try {
    const userRef = doc(db, 'user_profiles', userUUID);
    await setDoc(userRef, {
      userUUID,
      lastUpdated: serverTimestamp(),
      createdAt: new Date().toISOString(),
      ...profileData
    }, { merge: true });
    console.log('✅ User profile updated for:', userUUID);
    return userUUID;
  } catch (error) {
    console.error('❌ Error updating user profile:', error);
    throw error;
  }
};

export const getUserProfile = async (userUUID) => {
  try {
    const userRef = doc(db, 'user_profiles', userUUID);
    const docSnap = await getDoc(userRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.log('No user profile found for:', userUUID);
      return null;
    }
  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    throw error;
  }
};

// ============================================================================
// STAGE PROGRESSIONS
// ============================================================================

export const addStageProgression = async (userUUID, stageData) => {
  try {
    const docRef = await addDoc(collection(db, 'stage_progressions'), {
      userUUID,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
      type: 'stage_progression',
      ...stageData
    });
    console.log('✅ Stage progression added:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error adding stage progression:', error);
    throw error;
  }
};

export const getUserStageProgressions = async (userUUID) => {
  try {
    const q = query(
      collection(db, 'stage_progressions'),
      where('userUUID', '==', userUUID),
      orderBy('timestamp', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('❌ Error fetching stage progressions:', error);
    throw error;
  }
};

// ============================================================================
// CONVERSATION SESSIONS
// ============================================================================

export const updateConversationSession = async (userUUID, sessionData) => {
  try {
    const sessionRef = doc(db, 'conversation_sessions', userUUID);
    await setDoc(sessionRef, {
      userUUID,
      lastActivity: serverTimestamp(),
      ...sessionData
    }, { merge: true });
    console.log('✅ Session updated for:', userUUID);
    return userUUID;
  } catch (error) {
    console.error('❌ Error updating session:', error);
    throw error;
  }
};

export const getUserSession = async (userUUID) => {
  try {
    const sessionRef = doc(db, 'conversation_sessions', userUUID);
    const docSnap = await getDoc(sessionRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.log('No session found for:', userUUID);
      return null;
    }
  } catch (error) {
    console.error('❌ Error fetching session:', error);
    throw error;
  }
};

// ============================================================================
// SUBSCRIPTION FUNCTIONS (for your separate subscription app)
// ============================================================================

export const createSubscription = async (userUUID, subscriptionData) => {
  try {
    const docRef = await addDoc(collection(db, 'subscriptions'), {
      userUUID,
      createdAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
      ...subscriptionData
    });
    console.log('✅ Subscription created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating subscription:', error);
    throw error;
  }
};

export const getUserSubscription = async (userUUID) => {
  try {
    const q = query(
      collection(db, 'subscriptions'),
      where('userUUID', '==', userUUID),
      where('status', 'in', ['active', 'trialing'])
    );
    const querySnapshot = await getDocs(q);
    const subscriptions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return subscriptions[0] || null; // Return the first active subscription
  } catch (error) {
    console.error('❌ Error fetching subscription:', error);
    throw error;
  }
};

export const updateSubscription = async (subscriptionId, updateData) => {
  try {
    const subscriptionRef = doc(db, 'subscriptions', subscriptionId);
    await updateDoc(subscriptionRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    console.log('✅ Subscription updated:', subscriptionId);
    return subscriptionId;
  } catch (error) {
    console.error('❌ Error updating subscription:', error);
    throw error;
  }
};
