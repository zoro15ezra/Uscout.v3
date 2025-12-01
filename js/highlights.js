// highlights.js (LINK-ONLY VERSION)

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

  if (!container) return;

  postBtn.addEventListener("click", async () => {
    const videoUrl = urlInput.value.trim();
    const title = titleInput.value.trim();

    if (!videoUrl) {
      errorBox.classList.remove("hidden");
      errorBox.textContent = "Please paste a valid video link.";
      return;
    }

    errorBox.classList.add("hidden");

    await addDoc(collection(db, "football_highlights"), {
      userId: state.currentUserId,
      videoUrl,
      title,
      timestamp: Date.now(),
    });

    urlInput.value = "";
    titleInput.value = "";
  });

  const q = query(
    collection(db, "football_highlights"),
    orderBy("timestamp", "desc")
  );

  onSnapshot(q, (snapshot) => {
    container.innerHTML = "";
    loading.classList.add("hidden");

    snapshot.forEach((docSnap) => {
      container.appendChild(renderHighlight(docSnap.data()));
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

  const embed = getEmbed(item.videoUrl);

  wrapper.innerHTML = `
    <div class="aspect-video bg-black overflow-hidden">
      ${embed}
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
  if (!url) return "";

  // YouTube
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const id = url.split("v=")[1]?.split("&")[0] || url.split("/").pop();
    return `<iframe class="w-full h-full" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`;
  }

  // TikTok
  if (url.includes("tiktok.com")) {
    return `
      <blockquote class="tiktok-embed" cite="${url}">
        <a href="${url}"></a>
      </blockquote>
      <script async src="https://www.tiktok.com/embed.js"></script>
    `;
  }

  // Vimeo
  if (url.includes("vimeo.com")) {
    const id = url.split("/").pop();
    return `<iframe class="w-full h-full" src="https://player.vimeo.com/video/${id}" frameborder="0" allowfullscreen></iframe>`;
  }

  // MP4 direct link
  if (url.endsWith(".mp4")) {
    return `<video class="w-full h-full" controls src="${url}"></video>`;
  }

  return `<a href="${url}" target="_blank" class="text-secondary underline block p-3">Open Video</a>`;
}

/* -----------------------------------
   LOAD USER HIGHLIGHTS IN PROFILE
------------------------------------ */
export async function loadUserHighlights(userId) {
  const q = query(
    collection(db, "football_highlights"),
    where("userId", "==", userId),
    orderBy("timestamp", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
