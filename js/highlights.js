
// js/highlights.js
import { db, storage, COLLECTIONS, state } from "./firebase.js";
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
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-storage.js";
import { escapeHtml } from "./utils.js";

export function initHighlights() {
  const fileInput = document.getElementById("highlight-file");
  const fileLabel = document.getElementById("file-upload-label");
  const urlInput = document.getElementById("highlight-url");
  const postBtn = document.getElementById("highlight-post-button");

  fileInput?.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      fileLabel.textContent = `Selected: ${e.target.files[0].name}`;
      urlInput.value = "";
      document.getElementById("highlight-error").classList.add("hidden");
    } else {
      fileLabel.textContent = "Select a video file";
    }
  });

  urlInput?.addEventListener("input", () => {
    if (urlInput.value.trim().length > 0) {
      fileInput.value = "";
      fileLabel.textContent = "Select a video file";
      document.getElementById("highlight-error").classList.add("hidden");
    }
  });

  postBtn?.addEventListener("click", handleHighlightPost);
  listenToHighlights();
}

async function handleHighlightPost() {
  if (!state.currentUserId) {
    alert("Please wait for authentication...");
    return;
  }

  const fileInput = document.getElementById("highlight-file");
  const urlInput = document.getElementById("highlight-url");
  const titleInput = document.getElementById("highlight-title");
  const errorEl = document.getElementById("highlight-error");
  const btn = document.getElementById("highlight-post-button");

  const file = fileInput.files[0];
  const url = urlInput.value.trim();
  const title = titleInput.value.trim() || "My Highlight";

  if (!file && !url) {
    errorEl.classList.remove("hidden");
    return;
  }

  errorEl.classList.add("hidden");
  btn.disabled = true;
  btn.textContent = "Processing...";

  let videoUrl = url;

  try {
    if (file) {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}_${title.replace(/\s/g, "_")}.${ext}`;
      const path = `highlights/${state.currentUserId}/${fileName}`;
      const ref = storageRef(storage, path);

      const uploadTask = uploadBytesResumable(ref, file);
      await new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snap) => {
            const progress =
              (snap.bytesTransferred / snap.totalBytes) * 100;
            btn.textContent = `Uploading... ${Math.round(progress)}%`;
          },
          (err) => reject(err),
          async () => {
            videoUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve();
          }
        );
      });
    }

    const p = state.currentUserProfile || {};
    await addDoc(collection(db, COLLECTIONS.HIGHLIGHTS), {
      userId: state.currentUserId,
      username: p.name || "Player",
      title,
      videoUrl,
      timestamp: serverTimestamp(),
    });

    fileInput.value = "";
    urlInput.value = "";
    titleInput.value = "";
    document.getElementById("file-upload-label").textContent =
      "Select a video file";
    btn.textContent = "Share Highlight";
    btn.disabled = false;

    alert("Highlight shared successfully!");
  } catch (err) {
    console.error("Highlight error", err);
    alert("Failed to upload highlight. Check Storage Rules. " + err.message);
    btn.textContent = "Share Highlight";
    btn.disabled = false;
  }
}

function listenToHighlights() {
  const loadingEl = document.getElementById("highlights-loading");
  try {
    const q = query(
      collection(db, COLLECTIONS.HIGHLIGHTS),
      orderBy("timestamp", "desc")
    );
    onSnapshot(
      q,
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        renderHighlights(arr);
        if (loadingEl) loadingEl.style.display = "none";
      },
      (err) => console.error("Highlights listener error", err)
    );
  } catch (e) {
    console.error(e);
  }
}

function renderHighlights(highlights) {
  const container = document.getElementById("highlights-container");
  if (!container) return;
  container.innerHTML = "";

  if (!highlights.length) {
    container.innerHTML =
      '<div class="col-span-full text-center p-8 text-slate-400 text-xs"><i class="fa-regular fa-circle-play text-xl mb-2"></i><p>No highlights yet. Upload yours!</p></div>';
    return;
  }

  highlights.forEach((h) => {
    const a = document.createElement("a");
    a.href = h.videoUrl || "#";
    a.target = "_blank";
    a.className =
      "aspect-[9/16] bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex flex-col items-center justify-center p-3 text-white relative overflow-hidden group";
    a.innerHTML = `
      <div class="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition"></div>
      <i class="fa-solid fa-play-circle text-2xl mb-1 relative z-10"></i>
      <p class="text-[11px] font-semibold text-center relative z-10">${escapeHtml(
        h.title || "Highlight"
      )}</p>
      <p class="text-[10px] text-slate-300 mt-0.5 relative z-10">${escapeHtml(
        h.username || "Player"
      )}</p>
    `;
    container.appendChild(a);
  });
}

export async function loadUserHighlights(userId) {
  const q = query(
    collection(db, COLLECTIONS.HIGHLIGHTS),
    where("userId", "==", userId),
    orderBy("timestamp", "desc")
  );
  const snap = await getDocs(q);
  const arr = [];
  snap.forEach((d) => {
    const data = d.data();
    arr.push({ id: d.id, ...data });
  });
  return arr;
}
