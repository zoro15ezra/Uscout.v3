// js/profile.js (FULL, CLEAN, FIXED VERSION)

import { db, COLLECTIONS, state } from "./firebase.js";
import {
  doc,
  updateDoc,
  onSnapshot,
  collection,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

import {
  escapeHtml,
  toggleModal,
  copyToClipboard,
  formatTime,
} from "./utils.js";

/* -----------------------------------
   ELEMENTS
------------------------------------ */
const openProfileBtn = document.getElementById("open-profile-btn");
const floatingProfileBtn = document.getElementById("floating-profile-btn");
const sidebarProfileBtn = document.getElementById("sidebar-profile-btn");

// NEW FEED PAGE PROFILE BUTTON
const feedProfileBtn = document.getElementById("feed-profile-btn");

// Profile modal elements
const profileModal = document.getElementById("profile-modal");
const profileCancelBtn = document.getElementById("profile-cancel-btn");
const profileForm = document.getElementById("profile-form");
const userIdDisplay = document.getElementById("user-id-display");

/* -----------------------------------
   OPEN PROFILE MODAL (Unified)
------------------------------------ */
function openProfileModal() {
  if (!state.currentUserProfile) return;
  const p = state.currentUserProfile;

  document.getElementById("profile-name-input").value = p.name || "";
  document.getElementById("profile-position-input").value = p.position || "Unspecified";
  document.getElementById("profile-club-input").value = p.club || "";
  document.getElementById("profile-phone-input").value = p.phone || "";
  document.getElementById("profile-instagram-input").value = p.instagram || "";
  document.getElementById("profile-twitter-input").value = p.twitter || "";
  document.getElementById("profile-tiktok-input").value = p.tiktok || "";

  if (userIdDisplay) userIdDisplay.textContent = state.currentUserId || "";

  toggleModal("profile-modal", true);
}

// Attach unified handler
openProfileBtn?.addEventListener("click", openProfileModal);
floatingProfileBtn?.addEventListener("click", openProfileModal);
sidebarProfileBtn?.addEventListener("click", openProfileModal);
feedProfileBtn?.addEventListener("click", openProfileModal);

/* -----------------------------------
   CLOSE PROFILE MODAL
------------------------------------ */
profileCancelBtn?.addEventListener("click", () => toggleModal("profile-modal", false));

/* -----------------------------------
   SAVE PROFILE
------------------------------------ */
profileForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!state.currentUserId) return;

  const newProfile = {
    name: document.getElementById("profile-name-input").value.trim(),
    position: document.getElementById("profile-position-input").value,
    club: document.getElementById("profile-club-input").value.trim(),
    phone: document.getElementById("profile-phone-input").value.trim(),
    instagram: document.getElementById("profile-instagram-input").value.trim(),
    twitter: document.getElementById("profile-twitter-input").value.trim(),
    tiktok: document.getElementById("profile-tiktok-input").value.trim(),
  };

  try {
    await updateDoc(
      doc(db, COLLECTIONS.USERS, state.currentUserId),
      newProfile
    );
    alert("Profile updated");
    toggleModal("profile-modal", false);
  } catch (err) {
    console.error("Profile update error", err);
    alert("Failed to update profile");
  }
});

/* -----------------------------------
   LISTEN TO USER DOCUMENTS (for sidebar suggestions, DM lists, etc.)
------------------------------------ */
export function listenToUsers() {
  const usersRef = collection(db, COLLECTIONS.USERS);
  onSnapshot(usersRef, (snap) => {
    const arr = [];
    snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
    state.allUsers = arr;
    refreshProfileSidebar();
  });
}

/* -----------------------------------
   REFRESH SIDEBAR PROFILE SUMMARY
------------------------------------ */
export function refreshProfileSidebar() {
  if (!state.currentUserProfile) return;

  const p = state.currentUserProfile;

  const nameEl = document.getElementById("sidebar-profile-name");
  const posEl = document.getElementById("sidebar-profile-position");
  const clubEl = document.getElementById("sidebar-profile-club");
  const emailEl = document.getElementById("sidebar-profile-email");
  const phoneEl = document.getElementById("sidebar-profile-phone-display");
  const followersCount = document.getElementById("followers-count");
  const followingCount = document.getElementById("following-count");

  if (nameEl) nameEl.textContent = p.name || "Anonymous Player";
  if (posEl) posEl.textContent = p.position || "Unspecified";
  if (clubEl) clubEl.textContent = p.club || "Not specified";
  if (emailEl) emailEl.textContent = p.email || "Not set";
  if (phoneEl) phoneEl.textContent = p.phone || "Not set";
  if (followersCount) followersCount.textContent = (p.followers || []).length;
  if (followingCount) followingCount.textContent = (p.following || []).length;
}

/* -----------------------------------
   VIEW OTHER USER PROFILE
------------------------------------ */
export async function viewUserProfile(userId) {
  const docRef = doc(db, COLLECTIONS.USERS, userId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) return;

  const data = snap.data();

  document.getElementById("user-profile-name").textContent = data.name || "Player";
  document.getElementById("user-profile-position").textContent = data.position || "Unspecified";
  document.getElementById("user-profile-club").textContent = data.club || "N/A";

  document.getElementById("user-profile-email").textContent = data.email || "Not set";
  document.getElementById("user-profile-phone").textContent = data.phone || "Not set";

  const followersEl = document.getElementById("user-profile-followers-count");
  const followingEl = document.getElementById("user-profile-following-count");

  if (followersEl) followersEl.textContent = (data.followers || []).length;
  if (followingEl) followingEl.textContent = (data.following || []).length;

  // Social links
  const socialWrap = document.getElementById("user-profile-social-links");
  socialWrap.innerHTML = "";

  if (data.instagram) {
    const a = document.createElement("a");
    a.href = `https://instagram.com/${data.instagram}`;
    a.target = "_blank";
    a.textContent = `Instagram: ${data.instagram}`;
    a.className = "px-2 py-1 rounded-full bg-slate-900 text-white text-xs";
    socialWrap.appendChild(a);
  }

  if (data.twitter) {
    const a = document.createElement("a");
    a.href = `https://twitter.com/${data.twitter}`;
    a.target = "_blank";
    a.textContent = `Twitter: ${data.twitter}`;
    a.className = "px-2 py-1 rounded-full bg-slate-900 text-white text-xs";
    socialWrap.appendChild(a);
  }

  if (data.tiktok) {
    const a = document.createElement("a");
    a.href = `https://tiktok.com/@${data.tiktok}`;
    a.target = "_blank";
    a.textContent = `TikTok: ${data.tiktok}`;
    a.className = "px-2 py-1 rounded-full bg-slate-900 text-white text-xs";
    socialWrap.appendChild(a);
  }

  // Show modal
  toggleModal("user-profile-modal", true);
}

/* -----------------------------------
   INIT PROFILE SYSTEM
------------------------------------ */
export function initProfile() {
  if (!state.currentUserId) return;

  const ref = doc(db, COLLECTIONS.USERS, state.currentUserId);

  onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    state.currentUserProfile = snap.data();
    refreshProfileSidebar();
  });
}
