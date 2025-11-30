
// js/feed.js
import { db, COLLECTIONS, state } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { escapeHtml, formatTime } from "./utils.js";
import { viewUserProfile } from "./profile.js";

export function initFeed() {
  const postContent = document.getElementById("post-content");
  const postButton = document.getElementById("post-button");

  if (postContent) {
    postContent.addEventListener("input", (e) => {
      postButton.disabled = e.target.value.trim().length === 0;
    });
  }

  postButton?.addEventListener("click", handlePost);
  listenToFeed();
}

async function handlePost() {
  if (!state.currentUserId) {
    alert("Please wait for authentication...");
    return;
  }
  const textarea = document.getElementById("post-content");
  const btn = document.getElementById("post-button");
  const content = textarea.value.trim();
  if (!content) return;

  btn.disabled = true;
  btn.textContent = "Posting...";

  const p = state.currentUserProfile || {};

  try {
    await addDoc(collection(db, COLLECTIONS.POSTS), {
      userId: state.currentUserId,
      username: p.name || "Anonymous Player",
      position: p.position || "",
      club: p.club || "",
      content,
      timestamp: serverTimestamp(),
    });
    textarea.value = "";
    btn.textContent = "Post Update";
    btn.disabled = true;
  } catch (err) {
    console.error("Post error", err);
    alert("Failed to post. Please try again.");
    btn.textContent = "Post Update";
    btn.disabled = false;
  }
}

function listenToFeed() {
  const loadingEl = document.getElementById("loading-indicator");
  try {
    const q = query(
      collection(db, COLLECTIONS.POSTS),
      orderBy("timestamp", "desc")
    );
    onSnapshot(
      q,
      (snap) => {
        const posts = [];
        snap.forEach((d) => posts.push({ id: d.id, ...d.data() }));
        renderFeed(posts);
        if (loadingEl) loadingEl.style.display = "none";
      },
      (err) => {
        console.error("Feed listener error", err);
        if (loadingEl)
          loadingEl.innerHTML =
            '<p class="text-red-400 text-xs">Error loading feed.</p>';
      }
    );
  } catch (e) {
    console.error(e);
    if (loadingEl)
      loadingEl.innerHTML =
        '<p class="text-red-400 text-xs">Error initializing feed.</p>';
  }
}

function renderFeed(posts) {
  const container = document.getElementById("feed-container");
  if (!container) return;

  container.innerHTML = "";
  if (!posts.length) {
    container.innerHTML =
      '<div class="bg-slate-900 p-6 rounded-xl text-center text-slate-400 shadow-lg border border-slate-700 text-xs"><i class="fa-regular fa-inbox mb-2 text-slate-500 text-xl"></i><p>No posts yet. Be the first to share!</p></div>';
    return;
  }

  posts.forEach((post) => {
    const card = document.createElement("article");
    card.className =
      "bg-slate-900 p-4 sm:p-5 rounded-xl shadow-lg border border-slate-700 hover:border-emerald-500/60 hover:shadow-emerald-500/20 transition";

    const timeStr = post.timestamp
      ? formatTime(post.timestamp.toDate())
      : "Just now";

    card.innerHTML = `
      <div class="flex items-start gap-3 mb-2">
        <button class="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold cursor-pointer flex-shrink-0" data-user-avatar="${post.userId}">
          ${escapeHtml((post.username || "A")[0].toUpperCase())}
        </button>
        <div class="flex-grow min-w-0">
          <div class="flex items-center gap-2">
            <button class="font-bold text-slate-50 text-sm sm:text-base hover:text-emerald-400 truncate" data-user-name="${post.userId}">
              ${escapeHtml(post.username || "Anonymous Player")}
            </button>
            <span class="text-[11px] text-slate-400 flex-shrink-0">${escapeHtml(
              timeStr
            )}</span>
          </div>
          <p class="text-[11px] text-slate-400 mt-0.5">
            ${escapeHtml(post.position || "")}${
      post.club ? " • " + escapeHtml(post.club) : ""
    }
          </p>
        </div>
      </div>
      <p class="text-slate-50 whitespace-pre-wrap text-xs sm:text-sm">
        ${escapeHtml(post.content || "")}
      </p>
    `;

    card
      .querySelector(`[data-user-avatar="${post.userId}"]`)
      .addEventListener("click", () => viewUserProfile(post.userId));
    card
      .querySelector(`[data-user-name="${post.userId}"]`)
      .addEventListener("click", () => viewUserProfile(post.userId));

    container.appendChild(card);
  });
}

export async function loadUserPosts(userId) {
  const q = query(
    collection(db, COLLECTIONS.POSTS),
    where("userId", "==", userId),
    orderBy("timestamp", "desc")
  );
  const snap = await getDocs(q);
  const posts = [];
  snap.forEach((d) => {
    const data = d.data();
    posts.push({ id: d.id, ...data });
  });
  return posts;
}
