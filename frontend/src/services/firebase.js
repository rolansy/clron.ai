import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
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

// Auth functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
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