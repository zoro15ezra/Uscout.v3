// js/chat.js (UPDATED FOR SUBCOLLECTIONS)
import { db, COLLECTIONS, state } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

import { escapeHtml, formatTime } from "./utils.js";

let chatUnsub = null;
let dmUnsub = null;
let messagesUnsub = null;

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
   DM LISTENER (FIXED FOR SUBCOLLECTIONS)
------------------------------------------- */
export function startDmListener() {
  if (!state.currentUserId) {
    console.warn("No current user ID, skipping DM listener");
    return;
  }
  
  const listEl = document.getElementById("dm-list");
  if (!listEl) return;

  // Unsubscribe from previous listener
  if (dmUnsub) {
    dmUnsub();
    dmUnsub = null;
  }

  const chatsRef = collection(db, COLLECTIONS.CHATS);
  
  // Query for DM chats where current user is a participant
  const q = query(
    chatsRef,
    where("type", "==", "dm"),
    where("users", "array-contains", state.currentUserId),
    orderBy("lastTimestamp", "desc")
  );

  dmUnsub = onSnapshot(
    q,
    (snapshot) => {
      const threads = [];
      snapshot.forEach((doc) => {
        threads.push({ id: doc.id, ...doc.data() });
      });
      renderDmList(threads);
    },
    (error) => {
      console.error("DM listener error:", error);
      console.error("Error details:", error.code, error.message);
      
      // Check if it's an index error
      if (error.code === 'failed-precondition') {
        console.error("Need to create Firestore index for: chats, type (asc), users (array-contains), lastTimestamp (desc)");
        alert("Please create the required Firestore index in Firebase Console");
      }
    }
  );
}

function renderDmList(threads) {
  const listEl = document.getElementById("dm-list");
  if (!listEl) return;

  listEl.innerHTML = "";

  if (!threads || threads.length === 0) {
    listEl.innerHTML =
      '<p class="text-[11px] text-slate-500">No chats yet. Start messaging from profiles.</p>';
    return;
  }

  threads.forEach((thread) => {
    const otherId = (thread.users || []).find((id) => id !== state.currentUserId);
    const otherUser = state.allUsers.find((u) => u.id === otherId) || {};

    const name = otherUser.name || "Player";
    const lastMessage = thread.lastMessage || "Start chatting";
    const time = thread.lastTimestamp?.seconds 
      ? formatTime(new Date(thread.lastTimestamp.seconds * 1000))
      : "";

    const btn = document.createElement("button");
    btn.className =
      "w-full text-left p-3 rounded-lg hover:bg-slate-800 transition border border-slate-800 flex items-center gap-3";

    btn.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
        ${escapeHtml(name[0]?.toUpperCase() || "?")}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-slate-50 text-xs font-semibold truncate">${escapeHtml(name)}</p>
        <p class="text-[11px] text-slate-400 truncate">${escapeHtml(lastMessage)}</p>
      </div>
      <div class="text-[10px] text-slate-500">${escapeHtml(time)}</div>
    `;

    btn.addEventListener("click", () => openChat(thread.id, name, true));
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
   OPEN OR CREATE DM CHAT (UPDATED)
------------------------------------------- */
export async function openDirectChatWith(targetUserId) {
  if (!state.currentUserId) {
    alert("Please log in first.");
    return;
  }
  
  if (targetUserId === state.currentUserId) {
    alert("You cannot message yourself.");
    return;
  }

  const threadId = makeDmId(state.currentUserId, targetUserId);
  const chatRef = doc(db, COLLECTIONS.CHATS, threadId);

  try {
    const snap = await getDoc(chatRef);

    if (!snap.exists()) {
      // Get user info
      const me = state.allUsers.find(u => u.id === state.currentUserId) || 
                 state.currentUserProfile || 
                 { name: "You" };
      
      const other = state.allUsers.find(u => u.id === targetUserId) || 
                    { name: "Player" };

      // Create new DM chat document
      await setDoc(chatRef, {
        id: threadId,
        type: "dm",
        users: [state.currentUserId, targetUserId],
        names: {
          [state.currentUserId]: me.name || "You",
          [targetUserId]: other.name || "Player"
        },
        lastMessage: "",
        lastTimestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      console.log("Created new DM chat:", threadId);
    }

    const otherUser = state.allUsers.find(u => u.id === targetUserId) || {};
    const name = otherUser.name || "Player";

    // Switch to chat view if function exists
    if (window.__switchView) {
      window.__switchView("chat");
    }

    openChat(threadId, name, true);
  } catch (err) {
    console.error("Open DM error:", err);
    console.error("Error details:", err.code, err.message);
    alert("Failed to open chat: " + err.message);
  }
}

/* ------------------------------------------
   OPEN CHAT AND LISTEN TO MESSAGES SUBCOLLECTION
------------------------------------------- */
async function openChat(chatId, chatName, isDm) {
  // Unsubscribe from previous listeners
  if (chatUnsub) chatUnsub();
  if (messagesUnsub) messagesUnsub();

  // Update state
  state.currentChatId = chatId;

  // Update UI
  const roomContainer = document.getElementById("chat-room-container");
  const titleEl = document.getElementById("chat-room-title");
  const subtitleEl = document.getElementById("chat-room-subtitle");
  const inputArea = document.getElementById("chat-input-area");
  const placeholder = document.getElementById("chat-placeholder");

  if (roomContainer) roomContainer.classList.remove("hidden");
  if (titleEl) titleEl.textContent = chatName;
  if (subtitleEl) {
    subtitleEl.textContent = isDm 
      ? "Direct message" 
      : "Global chat with the whole network.";
  }
  if (inputArea) inputArea.classList.remove("hidden");
  if (placeholder) placeholder.style.display = "none";

  try {
    // Listen to chat document for updates (last message, etc.)
    const chatRef = doc(db, COLLECTIONS.CHATS, chatId);
    
    chatUnsub = onSnapshot(chatRef, (snap) => {
      if (!snap.exists()) {
        console.warn("Chat document doesn't exist:", chatId);
        return;
      }
      
      const data = snap.data();
      // Update last message in DM list if needed
      if (isDm && data.lastMessage) {
        // Could trigger DM list update here
      }
    });

    // Listen to messages subcollection
    const messagesRef = collection(db, COLLECTIONS.CHATS, chatId, "messages");
    const messagesQuery = query(
      messagesRef,
      orderBy("timestamp", "asc"),
      limit(100) // Limit messages for performance
    );

    messagesUnsub = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messages = [];
        snapshot.forEach((doc) => {
          messages.push({
            id: doc.id,
            ...doc.data()
          });
        });
        renderMessages(messages);
      },
      (error) => {
        console.error("Messages listener error:", error);
        alert("Failed to load messages.");
      }
    );

    console.log("Listening to chat:", chatId, "isDm:", isDm);
  } catch (err) {
    console.error("Open chat error:", err);
    alert("Failed to open chat: " + err.message);
  }
}

/* ------------------------------------------
   RENDER MESSAGES (UPDATED FOR SUBCOLLECTIONS)
------------------------------------------- */
function renderMessages(messages) {
  const container = document.getElementById("messages-container");
  if (!container) return;

  container.innerHTML = "";

  if (!messages || messages.length === 0) {
    container.innerHTML =
      '<div class="text-center text-slate-500 py-8 text-xs">No messages yet. Start the conversation!</div>';
    return;
  }

  messages.forEach((message) => {
    const isOwn = message.userId === state.currentUserId;
    let time = "now";
    
    // Handle timestamp (could be serverTimestamp object or string)
    if (message.timestamp?.seconds) {
      time = formatTime(new Date(message.timestamp.seconds * 1000));
    } else if (typeof message.timestamp === 'string') {
      time = formatTime(new Date(message.timestamp));
    } else if (message.timestamp instanceof Date) {
      time = formatTime(message.timestamp);
    }

    const div = document.createElement("div");
    div.className = `flex ${isOwn ? "justify-end" : "justify-start"} mb-2`;
    div.innerHTML = `
      <div class="max-w-[75%] ${
        isOwn ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-50"
      } rounded-lg p-2.5 text-xs">
        <p class="font-semibold mb-0.5">${escapeHtml(
          message.username || "Player"
        )}</p>
        <p class="whitespace-pre-wrap break-words">${escapeHtml(message.content || "")}</p>
        <p class="text-[10px] opacity-70 mt-1">${escapeHtml(time)}</p>
      </div>
    `;

    container.appendChild(div);
  });

  // Auto-scroll to bottom
  setTimeout(() => {
    container.scrollTop = container.scrollHeight;
  }, 100);
}

/* ------------------------------------------
   SEND MESSAGE TO SUBCOLLECTION
------------------------------------------- */
async function sendChatMessage() {
  if (!state.currentChatId || !state.currentUserId) {
    alert("Please select a chat and log in first.");
    return;
  }

  const input = document.getElementById("chat-message-input");
  const content = input.value.trim();
  
  if (!content) {
    alert("Please enter a message.");
    return;
  }

  if (content.length > 1000) {
    alert("Message is too long (max 1000 characters).");
    return;
  }

  try {
    // 1. Add message to messages subcollection
    const messagesRef = collection(db, COLLECTIONS.CHATS, state.currentChatId, "messages");
    
    await addDoc(messagesRef, {
      userId: state.currentUserId,
      username: state.currentUserProfile?.name || "Player",
      content: content,
      timestamp: serverTimestamp(),
    });

    // 2. Update the chat document with last message info
    const chatRef = doc(db, COLLECTIONS.CHATS, state.currentChatId);
    await updateDoc(chatRef, {
      lastMessage: content.length > 30 ? content.substring(0, 30) + "..." : content,
      lastTimestamp: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 3. Clear input
    input.value = "";
    input.focus();
    
    console.log("Message sent successfully");

  } catch (err) {
    console.error("Send chat error:", err);
    console.error("Error details:", err.code, err.message);
    
    if (err.code === 'permission-denied') {
      alert("Permission denied. Please check Firestore rules.");
    } else if (err.code === 'not-found') {
      alert("Chat not found. Please reopen the chat.");
    } else {
      alert("Failed to send message: " + err.message);
    }
  }
}

/* ------------------------------------------
   CLEANUP FUNCTION
------------------------------------------- */
export function cleanupChatListeners() {
  if (dmUnsub) {
    dmUnsub();
    dmUnsub = null;
  }
  if (chatUnsub) {
    chatUnsub();
    chatUnsub = null;
  }
  if (messagesUnsub) {
    messagesUnsub();
    messagesUnsub = null;
  }
  
  state.currentChatId = null;
}
