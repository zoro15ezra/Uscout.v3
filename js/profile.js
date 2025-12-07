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

  function openProfileModal() {
    if (!state.currentUserProfile) return;
    const p = state.currentUserProfile;
    document.getElementById("profile-name-input").value = p.name || "";
    document.getElementById("profile-position-input").value =
      p.position || "Unspecified";
    document.getElementById("profile-club-input").value = p.club || "";
    document.getElementById("profile-phone-input").value = p.phone || "";
    document.getElementById("profile-instagram-input").value =
      p.instagram || "";
    document.getElementById("profile-twitter-input").value = p.twitter || "";
    document.getElementById("profile-tiktok-input").value = p.tiktok || "";
    if (userIdDisplay) userIdDisplay.textContent = state.currentUserId || "";

    // ✅ FIX: pass the actual modal element, not the string ID
    toggleModal(profileModal, true);
  }

  openProfileBtn?.addEventListener("click", openProfileModal);
floatingProfileBtn?.addEventListener("click", () => {
  if (state.currentUserId) {
    viewUserProfile(state.currentUserId);
  }
});
  sidebarProfileBtn?.addEventListener("click", openProfileModal);

  profileCancelBtn?.addEventListener("click", () =>
    toggleModal(profileModal, false)
  );

  profileForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.currentUserId) return;
    const newProfile = {
      name: document.getElementById("profile-name-input").value.trim(),
      position: document.getElementById("profile-position-input").value,
      club: document.getElementById("profile-club-input").value.trim(),
      phone: document.getElementById("profile-phone-input").value.trim(),
      instagram: document
        .getElementById("profile-instagram-input")
        .value.trim(),
      twitter: document.getElementById("profile-twitter-input").value.trim(),
      tiktok: document.getElementById("profile-tiktok-input").value.trim(),
    };
    try {
      await updateDoc(
        doc(db, COLLECTIONS.USERS, state.currentUserId),
        newProfile
      );
      alert("Profile updated");
      toggleModal(profileModal, false);
    } catch (err) {
      console.error("Profile update error", err);
      alert("Failed to update profile");
    }
  });

  userIdDisplay?.addEventListener("click", () => {
    if (!state.currentUserId) return;
    copyToClipboard(state.currentUserId);
    alert("User ID copied to clipboard");
  });

  document
    .getElementById("followers-btn")
    ?.addEventListener("click", showFollowersModal);
  document
    .getElementById("following-btn")
    ?.addEventListener("click", showFollowingModal);

  document
    .getElementById("followers-close-btn")
    ?.addEventListener("click", () =>
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
  if (clubEl) clubEl.textContent = p.club || "Not specified";
  if (emailEl) emailEl.textContent = p.email || "Not set";
  if (phoneEl) phoneEl.textContent = p.phone || "Not set";
  if (followersCount) followersCount.textContent = (p.followers || []).length;
  if (followingCount) followingCount.textContent = (p.following || []).length;
  if (uidEl) uidEl.textContent = state.currentUserId || "Loading...";

  const ig = document.getElementById("profile-instagram-display");
  const tw = document.getElementById("profile-twitter-display");
  const tk = document.getElementById("profile-tiktok-display");

  if (ig) {
    if (p.instagram) {
      ig.textContent = p.instagram;
      ig.classList.remove("hidden");
    } else ig.classList.add("hidden");
  }
  if (tw) {
    if (p.twitter) {
      tw.textContent = p.twitter;
      tw.classList.remove("hidden");
    } else tw.classList.add("hidden");
  }
  if (tk) {
    if (p.tiktok) {
      tk.textContent = p.tiktok;
      tk.classList.remove("hidden");
    } else tk.classList.add("hidden");
  }
}

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
    (err) => console.error("Users listener error", err)
  );
}

async function showFollowersModal() {
  const modal = document.getElementById("followers-modal");
  const list = document.getElementById("followers-list");
  toggleModal(modal, true);

  const p = state.currentUserProfile || {};
  const ids = p.followers || [];

  if (!ids.length) {
    list.innerHTML =
      '<p class="text-slate-400 text-center text-xs">No followers yet</p>';
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
        <div class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
          ${escapeHtml((u.name || "P")[0].toUpperCase())}
        </div>
        <div>
          <p class="font-semibold text-slate-50 text-xs">${escapeHtml(
            u.name || "Player"
          )}</p>
          <p class="text-[11px] text-slate-400">${escapeHtml(
            u.position || ""
          )}</p>
        </div>
      </div>
    `;
    div
      .querySelector("[data-view-user]")
      .addEventListener("click", () => viewUserProfile(u.id));
    list.appendChild(div);
  });
}

async function showFollowingModal() {
  const modal = document.getElementById("following-modal");
  const list = document.getElementById("following-list");
  toggleModal(modal, true);

  const p = state.currentUserProfile || {};
  const ids = p.following || [];

  if (!ids.length) {
    list.innerHTML =
      '<p class="text-slate-400 text-center text-xs">Not following anyone yet</p>';
    return;
  }

  list.innerHTML = "";
  ids.forEach((id) => {
    const u = state.allUsers.find((x) => x.id === id);
    if (!u) return;
    const div = document.createElement("div");
    const isFollowing = (p.following || []).includes(id);
    div.className =
      "flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer transition";
    div.innerHTML = `
      <div class="flex items-center gap-3" data-view-user="${u.id}">
        <div class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
          ${escapeHtml((u.name || "P")[0].toUpperCase())}
        </div>
        <div>
          <p class="font-semibold text-slate-50 text-xs">${escapeHtml(
            u.name || "Player"
          )}</p>
          <p class="text-[11px] text-slate-400">${escapeHtml(
            u.position || ""
          )}</p>
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
    div
      .querySelector("[data-view-user]")
      .addEventListener("click", () => viewUserProfile(u.id));
    div
      .querySelector("[data-toggle-follow]")
      .addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFollow(u.id);
      });
    list.appendChild(div);
  });
}

export async function viewUserProfile(userId) {
  const modal = document.getElementById("user-profile-modal");

  try {
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    if (!snap.exists()) {
      alert("User not found");
      return;
    }
    const data = { id: userId, ...snap.data() };

    document.getElementById("user-profile-avatar").textContent = (
      data.name || "P"
    )[0].toUpperCase();
    document.getElementById("user-profile-name").textContent =
      data.name || "Player";
    document.getElementById("user-profile-position").textContent =
      data.position || "Player";
    document.getElementById("user-profile-club").textContent =
      data.club || "Club not specified";

    document.getElementById("user-profile-email").textContent = data.email
      ? `Email: ${data.email}`
      : "";
    document.getElementById("user-profile-phone").textContent = data.phone
      ? `Phone: ${data.phone}`
      : "";

    const socialWrap = document.getElementById("user-profile-social");
    socialWrap.innerHTML = "";
    if (data.instagram) {
      const a = document.createElement("a");
      a.href = `https://instagram.com/${data.instagram.replace("@", "")}`;
      a.target = "_blank";
      a.className =
        "px-2 py-1 rounded-full bg-pink-500/20 text-pink-100 text-[11px] font-semibold";
      a.textContent = `IG: ${data.instagram}`;
      socialWrap.appendChild(a);
    }
    if (data.twitter) {
      const a = document.createElement("a");
      a.href = `https://x.com/${data.twitter.replace("@", "")}`;
      a.target = "_blank";
      a.className =
        "px-2 py-1 rounded-full bg-sky-500/20 text-sky-100 text-[11px] font-semibold";
      a.textContent = `X: ${data.twitter}`;
      socialWrap.appendChild(a);
    }
    if (data.tiktok) {
      const a = document.createElement("a");
      a.href = `https://www.tiktok.com/@${data.tiktok.replace("@", "")}`;
      a.target = "_blank";
      a.className =
        "px-2 py-1 rounded-full bg-slate-950/40 text-white text-[11px] font-semibold";
      a.textContent = `TikTok: ${data.tiktok}`;
      socialWrap.appendChild(a);
    }

    document.getElementById("user-profile-followers-count").textContent = (
      data.followers || []
    ).length;
    document.getElementById("user-profile-following-count").textContent = (
      data.following || []
    ).length;

    const followBtn = document.getElementById("user-profile-follow-btn");
    const isFollowing = (state.currentUserProfile?.following || []).includes(
      userId
    );
    followBtn.textContent = isFollowing ? "Following" : "Follow";
    followBtn.className =
      "font-semibold py-2 px-6 rounded-full text-xs sm:text-sm transition " +
      (isFollowing
        ? "bg-slate-200 text-slate-900 hover:bg-slate-100"
        : "bg-white text-emerald-700 hover:bg-emerald-50");
    followBtn.onclick = async () => {
      await toggleFollow(userId);
      await viewUserProfile(userId);
    };

    // DM button
    const msgBtn = document.getElementById("user-profile-message-btn");
    if (msgBtn) {
      if (userId === state.currentUserId) {
        msgBtn.style.display = "none";
      } else {
        msgBtn.style.display = "";
        msgBtn.onclick = () => openDirectChatWith(userId);
      }
    }

    const posts = await loadUserPosts(userId);
    document.getElementById("user-profile-posts-count").textContent =
      posts.length;
    const postsContainer = document.getElementById("user-profile-posts");
    postsContainer.innerHTML = "";
    if (!posts.length) {
      postsContainer.innerHTML =
        '<p class="text-center text-slate-400 py-6 text-xs">No posts yet</p>';
    } else {
      posts.forEach((post) => {
        const div = document.createElement("div");
        const t = post.timestamp ? formatTime(post.timestamp.toDate()) : "Now";
        div.className =
          "bg-slate-900 p-3 rounded-lg border border-slate-700 text-xs";
        div.innerHTML = `
          <div class="text-[10px] text-slate-400 mb-1">${escapeHtml(t)}</div>
          <p class="text-slate-50 whitespace-pre-wrap">${escapeHtml(
            post.content || ""
          )}</p>
        `;
        postsContainer.appendChild(div);
      });
    }

    const highlights = await loadUserHighlights(userId);
    document.getElementById("user-profile-highlights-count").textContent =
      highlights.length;
    const hContainer = document.getElementById("user-profile-highlights");
    hContainer.innerHTML = "";
    if (!highlights.length) {
      hContainer.innerHTML =
        '<p class="col-span-full text-center text-slate-400 py-6 text-xs">No highlights yet</p>';
    } else {
      highlights.forEach((h) => {
        const a = document.createElement("a");
        a.href = h.videoUrl || "#";
        a.target = "_blank";
        a.className =
          "aspect-[9/16] bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex flex-col items-center justifycenter p-3 text-white relative overflow-hidden group hover:scale-105 transition";
        a.innerHTML = `
          <div class="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition"></div>
          <i class="fa-solid fa-play-circle text-2xl mb-1 relative z-10"></i>
          <p class="text-[11px] font-semibold text-center relative z-10">${escapeHtml(
            h.title || "Highlight"
          )}</p>
        `;
        hContainer.appendChild(a);
      });
    }

    toggleModal(modal, true);
    switchProfileTab("posts");
  } catch (err) {
    console.error("User profile error", err);
    alert("Failed to load profile");
  }
}

function switchProfileTab(tab) {
  const postsTab = document.getElementById("profile-posts-tab");
  const hTab = document.getElementById("profile-highlights-tab");
  if (tab === "posts") {
    postsTab.classList.remove("hidden");
    hTab.classList.add("hidden");
  } else {
    hTab.classList.remove("hidden");
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
