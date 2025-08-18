// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; 

//Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBawioJ6qGT5ZiYI4U1AI_f3w0a6tylkHo",
  authDomain: "asset-tracking-f8aeb.firebaseapp.com",
  databaseURL: "https://asset-tracking-f8aeb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "asset-tracking-f8aeb",
  storageBucket: "asset-tracking-f8aeb.appspot.com", 
  messagingSenderId: "840883319763",
  appId: "1:840883319763:web:55d9774296ac421caa7526",
  measurementId: "G-L0EZGB96MC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export const db = getFirestore(app);
export const storage = getStorage(app); 
export { auth, provider };
export default app;
