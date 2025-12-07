// js/profile.js
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
import { loadUserPosts } from "./feed.js";
import { loadUserHighlights } from "./highlights.js";
import { toggleFollow } from "./discover.js";
import { openDirectChatWith } from "./chat.js";

export function initProfile() {
  const openProfileBtn = document.getElementById("open-profile-btn");
  const floatingProfileBtn = document.getElementById("floating-profile-btn");
  const sidebarProfileBtn = document.getElementById("sidebar-profile-btn");
  const profileModal = document.getElementById("profile-modal");
  const profileCancelBtn = document.getElementById("profile-cancel-btn");
  const profileForm = document.getElementById("profile-form");
  const userIdDisplay = document.getElementById("user-id-display");

  // ------------------------------------------------------------------
  // 🔥 OVERRIDE FIX — REMOVE ALL OLD LISTENERS FROM GLOWING BUTTON
  // ------------------------------------------------------------------
  if (floatingProfileBtn) {
    const clone = floatingProfileBtn.cloneNode(true);
    floatingProfileBtn.parentNode.replaceChild(clone, floatingProfileBtn);
  }

  // ------------------------------------------------------------------
  // 🔥 APPLY CORRECT LISTENER: SHOW FULL PUBLIC PROFILE
  // ------------------------------------------------------------------
  document
    .getElementById("floating-profile-btn")
    ?.addEventListener("click", () => {
      if (state.currentUserId) viewUserProfile(state.currentUserId);
    });

  // ------------------------------------------------------------------
  // Sidebar + Header buttons STILL open EDIT PROFILE modal
  // ------------------------------------------------------------------
  openProfileBtn?.addEventListener("click", openEditProfileModal);
  sidebarProfileBtn?.addEventListener("click", openEditProfileModal);

  function openEditProfileModal() {
    if (!state.currentUserProfile) return;
    const p = state.currentUserProfile;

    document.getElementById("profile-name-input").value = p.name || "";
    document.getElementById("profile-position-input").value =
      p.position || "Unspecified";
    document.getElementById("profile-club-input").value = p.club || "";
    document.getElementById("profile-phone-input").value = p.phone || "";
    document.getElementById("profile-instagram-input").value = p.instagram || "";
    document.getElementById("profile-twitter-input").value = p.twitter || "";
    document.getElementById("profile-tiktok-input").value = p.tiktok || "";

    toggleModal(profileModal, true);
  }

  // Cancel button closes Edit Profile modal
  profileCancelBtn?.addEventListener("click", () =>
    toggleModal(profileModal, false)
  );

  // Save Profile
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
      await updateDoc(doc(db, COLLECTIONS.USERS, state.currentUserId), newProfile);
      alert("Profile updated");
      toggleModal(profileModal, false);
    } catch (err) {
      console.error("Profile update error", err);
      alert("Failed to update profile");
    }
  });

  // Copy ID
  userIdDisplay?.addEventListener("click", () => {
    if (!state.currentUserId) return;
    copyToClipboard(state.currentUserId);
    alert("User ID copied to clipboard");
  });

  // Followers / Following modals
  document
    .getElementById("followers-btn")
    ?.addEventListener("click", showFollowersModal);
  document
    .getElementById("following-btn")
    ?.addEventListener("click", showFollowingModal);

  document.getElementById("followers-close-btn")?.addEventListener("click", () =>
    toggleModal(document.getElementById("followers-modal"), false)
  );
  document
    .getElementById("following-close-btn")
    ?.addEventListener("click", () =>
      toggleModal(document.getElementById("following-modal"), false)
    );

  document
    .getElementById("user-profile-close-btn")
    ?.addEventListener("click", () =>
      toggleModal(document.getElementById("user-profile-modal"), false)
    );

  document.querySelectorAll(".profile-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-profile-tab");
      switchProfileTab(tab);
    });
  });
}

// ------------------------------------------------------------------
// UPDATE SIDEBAR PROFILE
// ------------------------------------------------------------------
export function refreshProfileSidebar() {
  const p = state.currentUserProfile || {};

  const nameEl = document.getElementById("profile-name-display");
  const posEl = document.getElementById("profile-position-display");
  const clubEl = document.getElementById("profile-club-display");
  const emailEl = document.getElementById("profile-email-display");
  const phoneEl = document.getElementById("profile-phone-display");
  const followersCount = document.getElementById("followers-count");
  const followingCount = document.getElementById("following-count");
  const uidEl = document.getElementById("user-id-display");

  if (nameEl) nameEl.textContent = p.name || "Anonymous Player";
  if (posEl) posEl.textContent = p.position || "Unspecified";
  if (clubEl) clubEl.textContent = p.club || "Not set";
  if (emailEl) emailEl.textContent = p.email || "Not set";
  if (phoneEl) phoneEl.textContent = p.phone || "Not set";

  if (followersCount) followersCount.textContent = (p.followers || []).length;
  if (followingCount) followingCount.textContent = (p.following || []).length;
  if (uidEl) uidEl.textContent = state.currentUserId || "Loading...";
}

// ------------------------------------------------------------------
// REAL-TIME USERS LISTENER
// ------------------------------------------------------------------
export function listenToUsers(onUsersChange) {
  const q = collection(db, COLLECTIONS.USERS);

  onSnapshot(
    q,
    (snap) => {
      const users = [];
      snap.forEach((d) => users.push({ id: d.id, ...d.data() }));
      state.allUsers = users;

      if (state.currentUserId) {
        const me = users.find((u) => u.id === state.currentUserId);
        if (me) state.currentUserProfile = me;
      }

      refreshProfileSidebar();
      onUsersChange?.(users);
    },
    (err) => console.error("Users listener error:", err)
  );
}

// ------------------------------------------------------------------
// PUBLIC PROFILE VIEW
// ------------------------------------------------------------------
export async function viewUserProfile(userId) {
  const modal = document.getElementById("user-profile-modal");

  try {
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    if (!snap.exists()) {
      alert("User not found");
      return;
    }

    const data = { id: userId, ...snap.data() };

    document.getElementById("user-profile-avatar").textContent =
      (data.name || "P")[0].toUpperCase();

    document.getElementById("user-profile-name").textContent =
      data.name || "Player";

    document.getElementById("user-profile-position").textContent =
      data.position || "Player";

    document.getElementById("user-profile-club").textContent =
      data.club || "No club listed";

    document.getElementById("user-profile-email").textContent = data.email
      ? `Email: ${data.email}`
      : "";

    document.getElementById("user-profile-phone").textContent = data.phone
      ? `Phone: ${data.phone}`
      : "";

    // Socials
    const wrap = document.getElementById("user-profile-social");
    wrap.innerHTML = "";

    if (data.instagram) {
      const el = document.createElement("a");
      el.href = `https://instagram.com/${data.instagram.replace("@", "")}`;
      el.target = "_blank";
      el.className =
        "px-2 py-1 rounded-full bg-pink-500/20 text-pink-100 text-[11px]";
      el.textContent = `IG: ${data.instagram}`;
      wrap.appendChild(el);
    }

    if (data.twitter) {
      const el = document.createElement("a");
      el.href = `https://x.com/${data.twitter.replace("@", "")}`;
      el.target = "_blank";
      el.className =
        "px-2 py-1 rounded-full bg-sky-500/20 text-sky-100 text-[11px]";
      el.textContent = `X: ${data.twitter}`;
      wrap.appendChild(el);
    }

    if (data.tiktok) {
      const el = document.createElement("a");
      el.href = `https://tiktok.com/@${data.tiktok.replace("@", "")}`;
      el.target = "_blank";
      el.className =
        "px-2 py-1 rounded-full bg-slate-700/40 text-white text-[11px]";
      el.textContent = `TikTok: ${data.tiktok}`;
      wrap.appendChild(el);
    }

    // Stats
    document.getElementById("user-profile-followers-count").textContent =
      (data.followers || []).length;

    document.getElementById("user-profile-following-count").textContent =
      (data.following || []).length;

    // Follow Button
    const followBtn = document.getElementById("user-profile-follow-btn");
    const isFollowing = (state.currentUserProfile?.following || []).includes(
      userId
    );

    followBtn.textContent = isFollowing ? "Following" : "Follow";
    followBtn.onclick = async () => {
      await toggleFollow(userId);
      await viewUserProfile(userId);
    };

    // DM Button
    const msgBtn = document.getElementById("user-profile-message-btn");

    if (userId === state.currentUserId) {
      msgBtn.style.display = "none";
    } else {
      msgBtn.style.display = "";
      msgBtn.onclick = () => openDirectChatWith(userId);
    }

    // Load Posts
    const posts = await loadUserPosts(userId);
    document.getElementById("user-profile-posts-count").textContent =
      posts.length;

    const postWrap = document.getElementById("user-profile-posts");
    postWrap.innerHTML = "";

    if (posts.length === 0) {
      postWrap.innerHTML =
        `<p class="text-center text-slate-400 py-6 text-xs">No posts yet</p>`;
    } else {
      posts.forEach((post) => {
        const div = document.createElement("div");
        const t = post.timestamp
          ? formatTime(post.timestamp.toDate())
          : "Now";

        div.className =
          "bg-slate-900 p-3 rounded-lg border border-slate-700 text-xs";
        div.innerHTML = `
          <div class="text-[10px] text-slate-400 mb-1">${escapeHtml(t)}</div>
          <p class="text-slate-50 whitespace-pre-wrap">${escapeHtml(
            post.content || ""
          )}</p>
        `;

        postWrap.appendChild(div);
      });
    }

    // Load Highlights
    const highs = await loadUserHighlights(userId);
    document.getElementById("user-profile-highlights-count").textContent =
      highs.length;

    const hWrap = document.getElementById("user-profile-highlights");
    hWrap.innerHTML = "";

    if (highs.length === 0) {
      hWrap.innerHTML =
        `<p class="col-span-full text-center text-slate-400 py-6 text-xs">No highlights yet</p>`;
    } else {
      highs.forEach((h) => {
        const a = document.createElement("a");
        a.href = h.videoUrl;
        a.target = "_blank";
        a.className =
          "aspect-[9/16] bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg p-3 " +
          "flex flex-col items-center justify-center text-white group overflow-hidden hover:scale-105 transition";

        a.innerHTML = `
          <div class="absolute inset-0 bg-black/50 group-hover:bg-black/20 transition"></div>
          <i class="fa-solid fa-play text-2xl relative z-10"></i>
          <p class="text-[11px] font-semibold relative z-10 mt-1">${escapeHtml(
            h.title
          )}</p>
        `;

        hWrap.appendChild(a);
      });
    }

    // SHOW MODAL
    toggleModal(modal, true);
    switchProfileTab("posts");
  } catch (err) {
    console.error("User profile error", err);
    alert("Failed to load profile.");
  }
}

// ------------------------------------------------------------------
// SWITCH TABS
// ------------------------------------------------------------------
function switchProfileTab(tab) {
  const postsTab = document.getElementById("profile-posts-tab");
  const highlightsTab = document.getElementById("profile-highlights-tab");

  if (tab === "posts") {
    postsTab.classList.remove("hidden");
    highlightsTab.classList.add("hidden");
  } else {
    highlightsTab.classList.remove("hidden");
    postsTab.classList.add("hidden");
  }

  document.querySelectorAll(".profile-tab").forEach((btn) => {
    const t = btn.getAttribute("data-profile-tab");

    if (t === tab) {
      btn.className =
        "profile-tab flex-1 py-2 px-4 text-center font-semibold text-secondary border-b-2 border-secondary";
    } else {
      btn.className =
        "profile-tab flex-1 py-2 px-4 text-center font-semibold text-slate-400 hover:text-slate-100";
    }
  });
}

// ------------------------------------------------------------------
// FOLLOWERS MODAL
// ------------------------------------------------------------------
async function showFollowersModal() {
  const modal = document.getElementById("followers-modal");
  const list = document.getElementById("followers-list");

  toggleModal(modal, true);

  const p = state.currentUserProfile || {};
  const ids = p.followers || [];

  if (ids.length === 0) {
    list.innerHTML =
      `<p class="text-center text-slate-400 text-xs">No followers yet</p>`;
    return;
  }

  list.innerHTML = "";

  ids.forEach((id) => {
    const u = state.allUsers.find((x) => x.id === id);
    if (!u) return;

    const div = document.createElement("div");
    div.className =
      "flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer transition";

    div.innerHTML = `
      <div class="flex items-center gap-3" data-view-user="${u.id}">
        <div class="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
          ${escapeHtml((u.name || "P")[0].toUpperCase())}
        </div>
        <div>
          <p class="font-semibold text-slate-50 text-xs">${escapeHtml(u.name)}</p>
          <p class="text-slate-400 text-[11px]">${escapeHtml(u.position || "")}</p>
        </div>
      </div>
    `;

    div.querySelector("[data-view-user]").addEventListener("click", () => {
      viewUserProfile(u.id);
    });

    list.appendChild(div);
  });
}

// ------------------------------------------------------------------
// FOLLOWING MODAL
// ------------------------------------------------------------------
async function showFollowingModal() {
  const modal = document.getElementById("following-modal");
  const list = document.getElementById("following-list");

  toggleModal(modal, true);

  const p = state.currentUserProfile || {};
  const ids = p.following || [];

  if (ids.length === 0) {
    list.innerHTML =
      `<p class="text-center text-slate-400 text-xs">Not following anyone</p>`;
    return;
  }

  list.innerHTML = "";

  ids.forEach((id) => {
    const u = state.allUsers.find((x) => x.id === id);
    if (!u) return;

    const isFollowing = (p.following || []).includes(id);

    const div = document.createElement("div");
    div.className =
      "flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition";

    div.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
          ${escapeHtml((u.name || "P")[0].toUpperCase())}
        </div>

        <div>
          <p class="font-semibold text-slate-50 text-xs">${escapeHtml(u.name)}</p>
          <p class="text-slate-400 text-[11px]">${escapeHtml(u.position || "")}</p>
        </div>
      </div>

      <button
        class="py-1 px-3 rounded-full text-[11px] font-semibold ${
          isFollowing
            ? "bg-slate-600 text-slate-100 hover:bg-slate-500"
            : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
        }"
        data-toggle-follow="${u.id}"
      >
        ${isFollowing ? "Unfollow" : "Follow"}
      </button>
    `;

    div.querySelector("[data-toggle-follow]").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFollow(u.id);
    });

    list.appendChild(div);
  });
}
