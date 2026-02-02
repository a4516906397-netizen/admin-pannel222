import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC2YTAuU-bwkbDYMxB_aUhkH4Ds7WlabfM",
  authDomain: "rebase-25058.firebaseapp.com",
  databaseURL: "https://rebase-25058-default-rtdb.firebaseio.com",
  projectId: "rebase-25058",
  storageBucket: "rebase-25058.firebasestorage.app",
  messagingSenderId: "613580109786",
  appId: "1:613580109786:web:f2f8e811b1bd4aac3a32e3",
  measurementId: "G-ZQ5HPS156P"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
