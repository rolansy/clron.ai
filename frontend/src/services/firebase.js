import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  connectAuthEmulator, // Add this for local testing
  setPersistence,       // Move these imports up here
  browserLocalPersistence
} from 'firebase/auth';
import { 
  getFirestore,
  collection,
  query, 
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore';

// Firebase configuration
// Use hardcoded values for testing, then replace with environment variables
const firebaseConfig = {
  apiKey: "AIzaSyBSHzi0qb2iwTzB-KDIE_XRKII3APkZhCg",
  authDomain: "clron-2.firebaseapp.com",
  projectId: "clron-2",
  storageBucket: "clron-2.appspot.com",
  messagingSenderId: "661074106893",
  appId: "1:661074106893:web:51060f9522c50b39695344",
  measurementId: "G-FR9XBPBY6L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// IMPORTANT: Enable persistence to improve login performance
setPersistence(auth, browserLocalPersistence).catch(error => {
  console.error("Error setting persistence:", error);
});

// Auth functions
export const signInWithGoogle = async () => {
  try {
    // Force re-authentication every time to avoid stale sessions
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
    
    const result = await signInWithPopup(auth, googleProvider);
    
    // Preemptively fetch the token to warm up the connection
    await result.user.getIdToken();
    
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    
    // Provide more specific error messages
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error("Sign-in was cancelled. Please try again.");
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error("Network error. Check your internet connection.");
    } else {
      throw error;
    }
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

export const onAuthChanged = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Firestore functions
export const getChats = async (userId, limitCount = 10) => {
  try {
    const chatsRef = collection(db, `users/${userId}/chats`);
    const q = query(chatsRef, orderBy("updated_at", "desc"), limit(limitCount));
    const querySnapshot = await getDocs(q);
    
    const chats = [];
    querySnapshot.forEach((doc) => {
      chats.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return chats;
  } catch (error) {
    console.error("Error getting chats", error);
    return [];
  }
};

export const getChatMessages = async (userId, chatId, limitCount = 50) => {
  try {
    const messagesRef = collection(db, `users/${userId}/chats/${chatId}/messages`);
    const q = query(messagesRef, orderBy("timestamp", "asc"), limit(limitCount));
    const querySnapshot = await getDocs(q);
    
    const messages = [];
    querySnapshot.forEach((doc) => {
      messages.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return messages;
  } catch (error) {
    console.error("Error getting chat messages", error);
    return [];
  }
};

export const getToken = async () => {
  const user = auth.currentUser;
  if (user) {
    return user.getIdToken();
  }
  return null;
};

export { auth, db };