// highlights.js
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { db, state } from "./firebase.js";

export function initHighlights() {
  const urlInput = document.getElementById("highlight-url");
  const titleInput = document.getElementById("highlight-title");
  const postBtn = document.getElementById("highlight-post-button");
  const errorBox = document.getElementById("highlight-error");
  const container = document.getElementById("highlights-container");
  const loading = document.getElementById("highlights-loading");

  // CREATE HIGHLIGHT — LINK ONLY
  postBtn.addEventListener("click", async () => {
    const videoUrl = urlInput.value.trim();
    const title = titleInput.value.trim();

    if (!videoUrl) {
      errorBox.textContent = "Please paste a valid video link.";
      errorBox.classList.remove("hidden");
      return;
    }

    errorBox.classList.add("hidden");

    await addDoc(collection(db, "football_highlights"), {
      userId: state.currentUserId,
      videoUrl,
      title,
      timestamp: Date.now()
    });

    urlInput.value = "";
    titleInput.value = "";
  });

  // LOAD HIGHLIGHTS LIVE
  const q = query(
    collection(db, "football_highlights"),
    orderBy("timestamp", "desc")
  );

  onSnapshot(q, (snapshot) => {
    container.innerHTML = "";
    loading.classList.add("hidden");

    snapshot.forEach((doc) => {
      const item = doc.data();
      container.appendChild(renderHighlight(item));
    });
  });
}

// RENDER SINGLE HIGHLIGHT
function renderHighlight(item) {
  const wrapper = document.createElement("div");
  wrapper.className =
    "bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-700";

  const embedHtml = getEmbed(item.videoUrl);

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

// AUTO-DETECT PLATFORM
function getEmbed(url) {
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
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
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

  // DIRECT MP4 LINK
  if (url.endsWith(".mp4")) {
    return `
      <video
        class="w-full h-full"
        controls
        src="${url}"
      ></video>
    `;
  }

  // FALLBACK (unknown link)
  return `
    <div class="p-4 text-center">
      <a href="${url}" target="_blank" class="text-secondary underline">
        Open Video
      </a>
    </div>
  `;
}
