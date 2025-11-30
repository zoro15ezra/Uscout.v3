// js/chat.js (FULLY FIXED VERSION)
import { db, COLLECTIONS, state } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

import { escapeHtml, formatTime } from "./utils.js";

let chatUnsub = null;
let dmUnsub = null;

/* ------------------------------------------
   INIT CHAT BUTTONS
------------------------------------------- */
export function initChat() {
  const buttons = document.querySelectorAll(".chat-room-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const chatId = btn.getAttribute("data-chat-id");
      openChat(chatId, "Global Team Chat", false);
    });
  });

  const sendBtn = document.getElementById("send-chat-btn");
  sendBtn?.addEventListener("click", sendChatMessage);

  const chatInput = document.getElementById("chat-message-input");
  chatInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
}

/* ------------------------------------------
   DM LISTENER
------------------------------------------- */
export function startDmListener() {
  if (!state.currentUserId) return;
  const listEl = document.getElementById("dm-list");
  if (!listEl) return;

  const ref = collection(db, COLLECTIONS.CHATS);

  // REQUIRES FIREBASE INDEX (type + users + lastTimestamp)
  const q = query(
    ref,
    where("type", "==", "dm"),
    where("users", "array-contains", state.currentUserId),
    orderBy("lastTimestamp", "desc")
  );

  if (dmUnsub) dmUnsub();

  dmUnsub = onSnapshot(
    q,
    (snap) => {
      const threads = [];
      snap.forEach((d) => threads.push({ id: d.id, ...d.data() }));
      renderDmList(threads);
    },
    (err) => console.error("DM listener error", err)
  );
}

function renderDmList(threads) {
  const listEl = document.getElementById("dm-list");
  if (!listEl) return;

  listEl.innerHTML = "";

  if (!threads.length) {
    listEl.innerHTML =
      '<p class="text-[11px] text-slate-500">No chats yet. Start messaging from profiles.</p>';
    return;
  }

  threads.forEach((t) => {
    const otherId = (t.users || []).find((id) => id !== state.currentUserId);
    const otherUser = state.allUsers.find((u) => u.id === otherId) || {};

    const name = otherUser.name || "Player";
    const last = t.lastMessage || "Start chatting";
    const time =
      t.lastTimestamp?.seconds != null
        ? formatTime(new Date(t.lastTimestamp.seconds * 1000))
        : "";

    const btn = document.createElement("button");
    btn.className =
      "w-full text-left p-3 rounded-lg hover:bg-slate-800 transition border border-slate-800 flex items-center gap-3";

    btn.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
        ${escapeHtml(name[0].toUpperCase())}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-slate-50 text-xs font-semibold truncate">${escapeHtml(
          name
        )}</p>
        <p class="text-[11px] text-slate-400 truncate">${escapeHtml(last)}</p>
      </div>
      <div class="text-[10px] text-slate-500">${escapeHtml(time)}</div>
    `;

    btn.addEventListener("click", () => openChat(t.id, name, true));
    listEl.appendChild(btn);
  });
}

/* ------------------------------------------
   CREATE DM THREAD ID
------------------------------------------- */
function makeDmId(uid1, uid2) {
  return ["dm", ...[uid1, uid2].sort()].join("_");
}

/* ------------------------------------------
   OPEN OR CREATE DM CHAT
------------------------------------------- */
export async function openDirectChatWith(targetUserId) {
  if (!state.currentUserId) {
    alert("Please log in first.");
    return;
  }
  if (targetUserId === state.currentUserId) return;

  const threadId = makeDmId(state.currentUserId, targetUserId);
  const ref = doc(db, COLLECTIONS.CHATS, threadId);

  try {
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      const me =
        state.allUsers.find((u) => u.id === state.currentUserId) ||
        state.currentUserProfile ||
        {};

      const other = state.allUsers.find((u) => u.id === targetUserId) || {};

      await setDoc(ref, {
        id: threadId,
        type: "dm",
        users: [state.currentUserId, targetUserId],
        createdAt: serverTimestamp(),
        lastMessage: "",
        lastTimestamp: serverTimestamp(),
        messages: [],
        names: {
          [state.currentUserId]: me.name || "You",
          [targetUserId]: other.name || "Player",
        },
      });
    }

    const otherUser =
      state.allUsers.find((u) => u.id === targetUserId) || {};
    const name = otherUser.name || "Player";

    if (window.__switchView) window.__switchView("chat");

    openChat(threadId, name, true);
  } catch (err) {
    console.error("Open DM error", err);
    alert("Failed to open chat.");
  }
}

/* ------------------------------------------
   OPEN CHAT (DM OR GLOBAL)
------------------------------------------- */
async function openChat(chatId, chatName, isDm) {
  state.currentChatId = chatId;

  const roomContainer = document.getElementById("chat-room-container");
  const titleEl = document.getElementById("chat-room-title");
  const subtitleEl = document.getElementById("chat-room-subtitle");
  const inputArea = document.getElementById("chat-input-area");
  const placeholder = document.getElementById("chat-placeholder");

  roomContainer?.classList.remove("hidden");
  if (titleEl) titleEl.textContent = chatName;
  if (subtitleEl)
    subtitleEl.textContent = isDm
      ? "Direct message"
      : "Global chat with the whole network.";

  inputArea?.classList.remove("hidden");
  if (placeholder) placeholder.style.display = "none";

  if (chatUnsub) chatUnsub();

  try {
    const chatRef = doc(db, COLLECTIONS.CHATS, chatId);
    const snap = await getDoc(chatRef);

    if (!snap.exists()) {
      await setDoc(chatRef, {
        id: chatId,
        type: isDm ? "dm" : "channel",
        users: [],
        messages: [],
        lastMessage: "",
        lastTimestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
    }

    chatUnsub = onSnapshot(chatRef, (s) => {
      if (s.exists()) renderMessages(s.data().messages || []);
    });
  } catch (err) {
    console.error("Open chat error", err);
    alert("Failed to open chat.");
  }
}

/* ------------------------------------------
   RENDER MESSAGES
------------------------------------------- */
function renderMessages(messages) {
  const container = document.getElementById("messages-container");
  if (!container) return;

  container.innerHTML = "";

  if (!messages.length) {
    container.innerHTML =
      '<div class="text-center text-slate-500 py-8 text-xs">No messages yet. Start the conversation!</div>';
    return;
  }

  messages.forEach((m) => {
    const div = document.createElement("div");
    const isOwn = m.userId === state.currentUserId;

    let time = "now";
    if (typeof m.timestamp === "string") {
      time = formatTime(new Date(m.timestamp));
    } else if (m.timestamp?.seconds != null) {
      time = formatTime(new Date(m.timestamp.seconds * 1000));
    }

    div.className = `flex ${isOwn ? "justify-end" : "justify-start"}`;
    div.innerHTML = `
      <div class="max-w-[75%] ${
        isOwn ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-50"
      } rounded-lg p-2.5 text-xs">
        <p class="font-semibold mb-0.5">${escapeHtml(
          m.username || "Player"
        )}</p>
        <p>${escapeHtml(m.content || "")}</p>
        <p class="text-[10px] opacity-70 mt-1">${escapeHtml(time)}</p>
      </div>
    `;

    container.appendChild(div);
  });

  container.scrollTop = container.scrollHeight;
}

/* ------------------------------------------
   SEND MESSAGE (FIXED)
------------------------------------------- */
async function sendChatMessage() {
  if (!state.currentChatId || !state.currentUserId) return;

  const input = document.getElementById("chat-message-input");
  const content = input.value.trim();
  if (!content) return;

  try {
    const ref = doc(db, COLLECTIONS.CHATS, state.currentChatId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data = snap.data();
    const messages = data.messages || [];

    // SAFE timestamp (no serverTimestamp inside arrays)
    const msg = {
      userId: state.currentUserId,
      username: state.currentUserProfile?.name || "Player",
      content,
      timestamp: new Date().toISOString(),
    };

    messages.push(msg);

    await updateDoc(ref, {
      messages,
      lastMessage: msg.content,
      lastTimestamp: serverTimestamp(), // SAFE here
    });

    input.value = "";
  } catch (err) {
    console.error("Send chat error", err);
    alert("Failed to send message.");
  }
}
