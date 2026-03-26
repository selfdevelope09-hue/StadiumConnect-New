// Firebase Configuration - REPLACE WITH YOUR CONFIG FROM FIREBASE CONSOLE
const firebaseConfig = {
    apiKey: "AIzaSyB6h_xxxxxxxxxxxxxxxxxxxxxx",
    authDomain: "stadiumconnect-xxxxx.firebaseapp.com",
    projectId: "stadiumconnect-xxxxx",
    storageBucket: "stadiumconnect-xxxxx.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// User functions
function getCurrentUser() {
    return auth.currentUser;
}

function logout() {
    auth.signOut();
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Check login status
auth.onAuthStateChanged((user) => {
    if (user) {
        localStorage.setItem('user', JSON.stringify({
            uid: user.uid,
            name: user.displayName,
            email: user.email,
            photo: user.photoURL
        }));
    }
});
