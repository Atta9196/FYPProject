// Firebase configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// Your Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyC5XjHDx6YwtLsyq9SSOdIRkOZxN_d0y24",
  authDomain: "ielts-coach-351d1.firebaseapp.com",
  projectId: "ielts-coach-351d1",
  storageBucket: "ielts-coach-351d1.firebasestorage.app",
  messagingSenderId: "461032813745",
  appId: "1:461032813745:web:085100f1da2479edb11e90"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Analytics (only in browser environment)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Export the app instance
export default app;



