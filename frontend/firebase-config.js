import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyDPUAq0MtB17t_bHNkqMbyjk_3MWOe5DCI",
  authDomain: "capstone-a2dd4.firebaseapp.com",
  projectId: "capstone-a2dd4",
  storageBucket: "capstone-a2dd4.firebasestorage.app",
  messagingSenderId: "531345542184",
  appId: "1:531345542184:web:57e16e8b17ab96dcd3391d",
  measurementId: "G-4D34BGS6CM"
};

export const API_BASE_URL = "http://localhost:3000";
export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);