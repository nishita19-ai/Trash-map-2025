// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBK0qK61tnH89ITMtcx8WqeB3Fodl1Q4rY",
  authDomain: "trash-map-2025.firebaseapp.com",
  projectId: "trash-map-2025",
  storageBucket: "trash-map-2025.firebasestorage.app",
  messagingSenderId: "748873818848",
  appId: "1:748873818848:web:405bef264f514a610da685",
  measurementId: "G-PP68VF3PKN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export auth & db so register.js can use them
export const auth = getAuth(app);
export const db = getFirestore(app);
