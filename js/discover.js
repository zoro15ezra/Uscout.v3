// js/discover.js
import { db, COLLECTIONS, state } from "./firebase.js";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { escapeHtml } from "./utils.js";
import { viewUserProfile } from "./profile.js";
import { openDirectChatWith } from "./chat.js";

// keep a module-level search term so renderDiscover can use it
let discoverSearchTerm = "";

export function initDiscover() {
  const searchInput = document.getElementById("discover-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      discoverSearchTerm = e.target.value.toLowerCase();
      renderDiscover();
    });
  }

  renderDiscover();
}

export function renderDiscover() {
  const container = document.getElementById("discover-container");
  const loading = document.getElementById("discover-loading");
  if (!container) return;

  if (loading) loading.style.display = "none";
  container.innerHTML = "";

  // start from all other users
  let others = state.allUsers.filter((u) => u.id !== state.currentUserId);

  // apply search filter if any text
  const term = discoverSearchTerm.trim();
  if (term.length > 0) {
    others = others.filter((user) => {
      const parts = [
        user.name,
        user.position,
        user.club,
        user.instagram,
        user.twitter,
        user.tiktok,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return parts.includes(term);
    });
  }

  if (!others.length) {
    container.innerHTML =
      '<div class="col-span-full text-center p-8 text-slate-400 text-xs"><p>No players match your search yet.</p></div>';
    return;
  }

  others.forEach((user) => {
    const isFollowing = (state.currentUserProfile?.following || []).includes(
      user.id
    );

    const card = document.createElement("div");
    card.className =
      "user-card bg-slate-900 p-4 sm:p-5 rounded-xl shadow-lg border border-slate-700 transition cursor-pointer";

    card.innerHTML = `
      <div class="flex items-start justify-between mb-3" data-view-user="${user.id}">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
            ${escapeHtml((user.name || "P")[0].toUpperCase())}
          </div>
          <div>
            <h4 class="font-bold text-slate-50 hover:text-emerald-400 text-sm sm:text-base">
              ${escapeHtml(user.name || "Player")}
            </h4>
            <p class="text-[11px] text-slate-400">
              ${escapeHtml(user.position || "Player")}
            </p>
            ${
              user.club
                ? `<p class="text-[11px] text-slate-500">${escapeHtml(
                    user.club
                  )}</p>`
                : ""
            }
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 text-[11px] text-slate-400 mb-3">
        <span><strong>${(user.followers || []).length}</strong> Followers</span>
        <span>•</span>
        <span><strong>${(user.following || []).length}</strong> Following</span>
      </div>

      <div class="flex flex-wrap gap-1 mb-3 text-[11px]">
        ${
          user.instagram
            ? `<span class="px-2 py-1 rounded-full bg-pink-500/20 text-pink-200">IG: ${escapeHtml(
                user.instagram
              )}</span>`
            : ""
        }
        ${
          user.twitter
            ? `<span class="px-2 py-1 rounded-full bg-sky-500/20 text-sky-100">X: ${escapeHtml(
                user.twitter
              )}</span>`
            : ""
        }
        ${
          user.tiktok
            ? `<span class="px-2 py-1 rounded-full bg-slate-50/10 text-slate-50">TikTok: ${escapeHtml(
                user.tiktok
              )}</span>`
            : ""
        }
      </div>

      <div class="flex gap-2">
        <button
          data-toggle-follow="${user.id}"
          class="flex-1 py-2 px-4 rounded-full text-xs sm:text-sm font-semibold transition ${
            isFollowing
              ? "bg-slate-600 text-slate-100 hover:bg-slate-500"
              : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
          }"
        >
          ${isFollowing ? "Following" : "Follow"}
        </button>
        <button
          data-dm-user="${user.id}"
          class="py-2 px-3 rounded-full text-xs sm:text-sm font-semibold bg-slate-800 text-slate-100 hover:bg-slate-700 flex items-center gap-1"
        >
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    `;

    card
      .querySelector(`[data-view-user="${user.id}"]`)
      .addEventListener("click", () => viewUserProfile(user.id));

    card
      .querySelector(`[data-toggle-follow="${user.id}"]`)
      .addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFollow(user.id);
      });

    card
      .querySelector(`[data-dm-user="${user.id}"]`)
      .addEventListener("click", (e) => {
        e.stopPropagation();
        openDirectChatWith(user.id);
      });

    container.appendChild(card);
  });
}

export async function toggleFollow(targetUserId) {
  if (!state.currentUserId) {
    alert("Please log in first");
    return;
  }
  if (state.currentUserId === targetUserId) {
    alert("You cannot follow yourself");
    return;
  }

  const myRef = doc(db, COLLECTIONS.USERS, state.currentUserId);
  const targetRef = doc(db, COLLECTIONS.USERS, targetUserId);

  const isFollowing = (state.currentUserProfile?.following || []).includes(
    targetUserId
  );

  try {
    if (isFollowing) {
      await updateDoc(myRef, {
        following: arrayRemove(targetUserId),
      });
      await updateDoc(targetRef, {
        followers: arrayRemove(state.currentUserId),
      });
    } else {
      await updateDoc(myRef, {
        following: arrayUnion(targetUserId),
      });
      await updateDoc(targetRef, {
        followers: arrayUnion(state.currentUserId),
      });
    }
  } catch (err) {
    console.error("Toggle follow error", err);
    alert("Failed to update follow status. Check Firestore Rules.");
  }
}
