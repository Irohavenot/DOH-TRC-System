// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBawioJ6qGT5ZiYI4U1AI_f3w0a6tylkHo",
  authDomain: "asset-tracking-f8aeb.firebaseapp.com",
  databaseURL: "https://asset-tracking-f8aeb-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "asset-tracking-f8aeb",
  storageBucket: "asset-tracking-f8aeb.firebasestorage.app",
  messagingSenderId: "840883319763",
  appId: "1:840883319763:web:55d9774296ac421caa7526",
  measurementId: "G-L0EZGB96MC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);