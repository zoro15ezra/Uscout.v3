
// js/auth.js
import { auth, db, COLLECTIONS, state, timestamp } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { show, hide } from "./utils.js";

export function initAuth({
  onUserReady,
  onUserCleared,
  refreshUserUI,
  startRealtime,
}) {
  const authScreen = document.getElementById("auth-screen");
  const appRoot = document.getElementById("app");
  const loginForm = document.getElementById("login-form-el");
  const registerForm = document.getElementById("register-form-el");
  const showRegisterBtn = document.getElementById("show-register-btn");
  const showLoginBtn = document.getElementById("show-login-btn");
  const authError = document.getElementById("auth-error");
  const logoutBtn = document.getElementById("logout-btn");

  showRegisterBtn?.addEventListener("click", () => {
    hide(document.getElementById("login-form"));
    show(document.getElementById("register-form"));
    hide(authError);
  });

  showLoginBtn?.addEventListener("click", () => {
    show(document.getElementById("login-form"));
    hide(document.getElementById("register-form"));
    hide(authError);
  });

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hide(authError);
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Login error", err);
      authError.textContent =
        err.message || "Failed to log in. Please check your credentials.";
      show(authError);
    }
  });

  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hide(authError);
    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;
    const position = document.getElementById("register-position").value;
    const phone = document.getElementById("register-phone").value.trim();
    const instagram = document.getElementById("register-instagram").value.trim();

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      const ref = doc(db, COLLECTIONS.USERS, user.uid);
      await setDoc(ref, {
        name,
        position: position || "Unspecified",
        club: "",
        followers: [],
        following: [],
        email,
        phone: phone || "",
        instagram: instagram || "",
        twitter: "",
        tiktok: "",
        createdAt: timestamp(),
      });
      // Auto logged-in; listener below will handle showing app
    } catch (err) {
      console.error("Register error", err);
      authError.textContent =
        err.message || "Failed to create account. Please try again.";
      show(authError);
    }
  });

  logoutBtn?.addEventListener("click", async () => {
    try {
      await signOut(auth);
    } catch {
      alert("Failed to log out");
    }
  });

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      state.currentUserId = user.uid;
      await ensureUserDoc(user.uid);
      hide(authScreen);
      show(appRoot);
      refreshUserUI?.();
      startRealtime?.();
      onUserReady?.(user);
    } else {
      state.currentUserId = null;
      state.currentUserProfile = null;
      show(authScreen);
      hide(appRoot);
      onUserCleared?.();
    }
  });
}

async function ensureUserDoc(uid) {
  const ref = doc(db, COLLECTIONS.USERS, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const base = {
      name: "Player" + uid.substring(0, 6),
      position: "Unspecified",
      club: "",
      followers: [],
      following: [],
      email: "",
      phone: "",
      instagram: "",
      twitter: "",
      tiktok: "",
      createdAt: timestamp(),
    };
    await setDoc(ref, base);
    state.currentUserProfile = { ...base, id: uid };
  } else {
    state.currentUserProfile = { ...snap.data(), id: uid };
  }
}
