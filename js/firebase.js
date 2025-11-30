
// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import {
  getFirestore,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-storage.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging.js";

// Your Firebase config
export const firebaseConfig = {
  apiKey: "AIzaSyCfcDDG3e7KTBevfFfl99oaT5Z_hv4q5iY",
  authDomain: "uscout-football-network.firebaseapp.com",
  projectId: "uscout-football-network",
  storageBucket: "uscout-football-network.appspot.com",
  messagingSenderId: "1072495022545",
  appId: "1:1072495022545:web:891dca6138f1ef691c50f0",
  measurementId: "G-9VC117MXGF",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);
export const timestamp = serverTimestamp;

export const COLLECTIONS = {
  USERS: "users",
  POSTS: "football_posts",
  HIGHLIGHTS: "football_highlights",
  CHATS: "football_chats", // used for global & DM threads
};

export const state = {
  currentUserId: null,
  currentUserProfile: null,
  allUsers: [],
  currentChatId: null,
};

setPersistence(auth, browserLocalPersistence).catch((e) =>
  console.warn("Auth persistence error:", e)
);
