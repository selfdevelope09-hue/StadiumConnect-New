import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAzorBcavy3e12mTbGKgUud-Mm-TxnnZIM",
  authDomain: "stadiumconnect-8fecb.firebaseapp.com",
  projectId: "stadiumconnect-8fecb",
  storageBucket: "stadiumconnect-8fecb.firebasestorage.app",
  messagingSenderId: "458108198578",
  appId: "1:458108198578:web:83d83646f0e24e718b73ab",
  measurementId: "G-X4S6Z1QPC1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Export for use in other files
export { auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, onAuthStateChanged, signOut };
