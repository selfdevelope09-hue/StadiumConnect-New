import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile, 
    onAuthStateChanged, 
    signOut,
    signInWithRedirect,
    getRedirectResult,
    browserPopupRedirectResolver,
    browserLocalPersistence,
    setPersistence
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    getDoc,
    query, 
    where,
    orderBy,
    limit,
    setDoc,
    Timestamp
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-storage.js";

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
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Add scopes
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Set persistence to LOCAL
setPersistence(auth, browserLocalPersistence);

// ============= DETECT WEBVIEW =============
function isWebView() {
    const ua = navigator.userAgent.toLowerCase();
    return (ua.includes('wv') || 
            ua.includes('webview') || 
            (ua.includes('android') && !ua.includes('chrome')) ||
            (ua.includes('iphone') && !ua.includes('safari')));
}

// ============= GOOGLE SIGN-IN FUNCTIONS =============

// Main Google Sign-In with auto fallback (Best for APK)
async function signInWithGoogle() {
    try {
        // Try popup first
        const result = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
        return { success: true, user: result.user, error: null };
    } catch (error) {
        console.log('Popup error:', error.code);
        
        // If popup fails, use redirect method
        if (error.code === 'auth/popup-blocked' || 
            error.code === 'auth/unauthorized-domain' ||
            error.message?.includes('popup') ||
            error.message?.includes('cross-origin') ||
            isWebView()) {
            
            try {
                await signInWithRedirect(auth, googleProvider);
                return { success: 'redirect', user: null, error: null };
            } catch (redirectError) {
                return { success: false, user: null, error: redirectError };
            }
        }
        return { success: false, user: null, error: error };
    }
}

// Handle redirect result (Call this on page load)
async function handleRedirectResult() {
    try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
            return { success: true, user: result.user, error: null };
        }
        return { success: false, user: null, error: null };
    } catch (error) {
        console.error('Redirect result error:', error);
        return { success: false, user: null, error: error };
    }
}

// Popup only (for browser)
async function signInWithGooglePopup() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return { success: true, user: result.user, error: null };
    } catch (error) {
        return { success: false, user: null, error: error };
    }
}

// Redirect only (for APK)
async function signInWithGoogleRedirect() {
    try {
        await signInWithRedirect(auth, googleProvider);
        return { success: 'redirect', user: null, error: null };
    } catch (error) {
        return { success: false, user: null, error: error };
    }
}

// ============= EMAIL/PASSWORD AUTH =============

// Sign Up with Email
async function signUpWithEmail(email, password, displayName) {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
            await updateProfile(result.user, { displayName: displayName });
        }
        return { success: true, user: result.user, error: null };
    } catch (error) {
        return { success: false, user: null, error: error };
    }
}

// Login with Email
async function loginWithEmail(email, password) {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: result.user, error: null };
    } catch (error) {
        return { success: false, user: null, error: error };
    }
}

// ============= USER MANAGEMENT =============

// Get current user
function getCurrentUser() {
    return auth.currentUser;
}

// Check if user is logged in
function isUserLoggedIn() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            resolve(user ? true : false);
        });
    });
}

// Logout
async function logoutUser() {
    try {
        await signOut(auth);
        clearUserFromLocalStorage();
        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: error };
    }
}

// Save user to localStorage
function saveUserToLocalStorage(user) {
    if (user) {
        localStorage.setItem('userLoggedIn', 'true');
        localStorage.setItem('userId', user.uid);
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userName', user.displayName || user.email?.split('@')[0] || 'User');
        localStorage.setItem('userPhoto', user.photoURL || '');
    }
}

// Clear user from localStorage
function clearUserFromLocalStorage() {
    localStorage.removeItem('userLoggedIn');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userPhoto');
}

// ============= DATABASE FUNCTIONS (FIRESTORE) =============

// Get all documents from a collection
async function getAllDocs(collectionName) {
    try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        const docs = [];
        querySnapshot.forEach((doc) => {
            docs.push({ id: doc.id, ...doc.data() });
        });
        return { success: true, data: docs, error: null };
    } catch (error) {
        return { success: false, data: [], error: error };
    }
}

// Get document by ID
async function getDocById(collectionName, docId) {
    try {
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { success: true, data: { id: docSnap.id, ...docSnap.data() }, error: null };
        } else {
            return { success: false, data: null, error: 'Document not found' };
        }
    } catch (error) {
        return { success: false, data: null, error: error };
    }
}

// Add document
async function addDocToCollection(collectionName, data) {
    try {
        const docRef = await addDoc(collection(db, collectionName), {
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        return { success: true, id: docRef.id, error: null };
    } catch (error) {
        return { success: false, id: null, error: error };
    }
}

// Update document
async function updateDocById(collectionName, docId, data) {
    try {
        const docRef = doc(db, collectionName, docId);
        await updateDoc(docRef, {
            ...data,
            updatedAt: new Date().toISOString()
        });
        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: error };
    }
}

// Delete document
async function deleteDocById(collectionName, docId) {
    try {
        const docRef = doc(db, collectionName, docId);
        await deleteDoc(docRef);
        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: error };
    }
}

// Query documents with where clause
async function queryDocs(collectionName, field, operator, value) {
    try {
        const q = query(collection(db, collectionName), where(field, operator, value));
        const querySnapshot = await getDocs(q);
        const docs = [];
        querySnapshot.forEach((doc) => {
            docs.push({ id: doc.id, ...doc.data() });
        });
        return { success: true, data: docs, error: null };
    } catch (error) {
        return { success: false, data: [], error: error };
    }
}

// ============= STORAGE FUNCTIONS =============

// Upload image
async function uploadImage(file, folder) {
    if (!file) return null;
    try {
        const fileName = `${folder}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        return { success: true, url: url, error: null };
    } catch (error) {
        console.error('Upload error:', error);
        return { success: false, url: null, error: error };
    }
}

// Delete image
async function deleteImage(imageUrl) {
    if (!imageUrl) return { success: true, error: null };
    try {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: error };
    }
}

// ============= EXPORTS =============

export {
    // Firebase instances
    app,
    auth,
    db,
    storage,
    
    // Google Sign-In
    googleProvider,
    signInWithGoogle,
    signInWithGooglePopup,
    signInWithGoogleRedirect,
    handleRedirectResult,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    
    // Email/Password
    signUpWithEmail,
    loginWithEmail,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    
    // User Management
    onAuthStateChanged,
    signOut,
    getCurrentUser,
    isUserLoggedIn,
    logoutUser,
    saveUserToLocalStorage,
    clearUserFromLocalStorage,
    
    // Firestore Database
    getAllDocs,
    getDocById,
    addDocToCollection,
    updateDocById,
    deleteDocById,
    queryDocs,
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    setDoc,
    Timestamp,
    
    // Storage
    uploadImage,
    deleteImage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
};
