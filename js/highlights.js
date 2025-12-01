// highlights.js (FINAL WORKING VERSION)

import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  where
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

import { db, state } from "./firebase.js";

/* -----------------------------------
   INITIALIZE HIGHLIGHTS PAGE
------------------------------------ */
export function initHighlights() {
  const urlInput = document.getElementById("highlight-url");
  const titleInput = document.getElementById("highlight-title");
  const postBtn = document.getElementById("highlight-post-button");
  const errorBox = document.getElementById("highlight-error");
  const container = document.getElementById("highlights-container");
  const loading = document.getElementById("highlights-loading");

  if (!container || !postBtn) return;

  // CREATE LINK HIGHLIGHT
  postBtn.addEventListener("click", async () => {
    const videoUrl = urlInput ? urlInput.value.trim() : "";
    const title = titleInput ? titleInput.value.trim() : "";

    if (!videoUrl) {
      if (errorBox) {
        errorBox.textContent = "Please paste a valid video link.";
        errorBox.classList.remove("hidden");
      }
      return;
    }

    if (errorBox) errorBox.classList.add("hidden");

    await addDoc(collection(db, "football_highlights"), {
      userId: state.currentUserId,
      videoUrl,
      title,
      timestamp: Date.now(),
    });

    if (urlInput) urlInput.value = "";
    if (titleInput) titleInput.value = "";
  });

  // REALTIME HIGHLIGHT LOADING
  const q = query(
    collection(db, "football_highlights"),
    orderBy("timestamp", "desc")
  );

  onSnapshot(q, (snapshot) => {
    container.innerHTML = "";
    if (loading) loading.classList.add("hidden");

    snapshot.forEach((docSnap) => {
      const item = docSnap.data();
      container.appendChild(renderHighlight(item));
    });
  });
}

/* -----------------------------------
   RENDER ONE HIGHLIGHT
------------------------------------ */
function renderHighlight(item) {
  const wrapper = document.createElement("div");
  wrapper.className =
    "bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-700";

  const embedHtml = getEmbed(item.videoUrl || "");

  wrapper.innerHTML = `
    <div class="aspect-video bg-black overflow-hidden">
      ${embedHtml}
    </div>
    <div class="p-2 text-xs sm:text-sm text-slate-200">
      ${item.title || "Highlight"}
    </div>
  `;

  return wrapper;
}

/* -----------------------------------
   AUTO-DETECT VIDEO TYPE
------------------------------------ */
function getEmbed(url) {
  if (!url) {
    return '<div class="w-full h-full flex items-center justify-center text-slate-400 text-xs">No video URL</div>';
  }

  // YOUTUBE
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const id =
      url.split("v=")[1]?.split("&")[0] ||
      url.split("/").pop();

    return `
      <iframe
        class="w-full h-full"
        src="https://www.youtube.com/embed/${id}"
        frameborder="0"
        allowfullscreen
      ></iframe>
    `;
  }

  // TIKTOK
  if (url.includes("tiktok.com")) {
    return `
      <blockquote class="tiktok-embed" cite="${url}" data-video-url="${url}">
        <a href="${url}"></a>
      </blockquote>
      <script async src="https://www.tiktok.com/embed.js"></script>
    `;
  }

  // VIMEO
  if (url.includes("vimeo.com")) {
    const id = url.split("/").pop();
    return `
      <iframe
        src="https://player.vimeo.com/video/${id}"
        class="w-full h-full"
        frameborder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowfullscreen
      ></iframe>
    `;
  }

  // DIRECT MP4
  if (url.endsWith(".mp4")) {
    return `
      <video class="w-full h-full" controls src="${url}"></video>
    `;
  }

  // fallback
  return `
    <div class="p-4 text-center">
      <a href="${url}" target="_blank" class="text-secondary underline">
        Open Video
      </a>
    </div>
  `;
}

/* -----------------------------------
   LOAD USER HIGHLIGHTS (profile modal)
------------------------------------ */
export async function loadUserHighlights(userId) {
  const q = query(
    collection(db, "football_highlights"),
    where("userId", "==", userId),
    orderBy("timestamp", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data()
  }));
}
