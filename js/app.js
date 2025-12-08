

import { state } from "./firebase.js";
import { initAuth } from "./auth.js";

import {
  initProfile,
  listenToUsers,
  refreshProfileSidebar,
} from "./profile.js";

import { initFeed } from "./feed.js";
import { initHighlights } from "./highlights.js";
import { initDiscover, renderDiscover } from "./discover.js";
import { initChat, startDmListener } from "./chat.js";
import { initNotifications } from "./notifications.js";

/* -----------------------------------
   VIEW SWITCHING
------------------------------------ */
function setupViewSwitching() {
  const views = ["home", "feed", "discover", "highlights", "chat"];
  const buttons = document.querySelectorAll(".view-btn");

  function switchView(view) {
    views.forEach((v) => {
      const el = document.getElementById(v + "-view");
      if (!el) return;
      if (v === view) el.classList.remove("hidden");
      else el.classList.add("hidden");
    });

    buttons.forEach((btn) => {
      const v = btn.getAttribute("data-view");
      btn.classList.toggle("active-nav", v === view);
    });
  }

  buttons.forEach((btn) => {
    const v = btn.getAttribute("data-view");
    btn.addEventListener("click", () => switchView(v));
  });

  document.querySelectorAll(".go-feed-btn").forEach((btn) =>
    btn.addEventListener("click", () => switchView("feed"))
  );

  window.__switchView = switchView;

  // default view
  switchView("home");
}

/* -----------------------------------
   REALTIME LISTENERS
------------------------------------ */
function startRealtime() {
  // users list (discover)
  listenToUsers(() => {
    renderDiscover();
  });

  // DM chats
  startDmListener();
}

/* -----------------------------------
   WHEN USER UI NEEDS REFRESH
------------------------------------ */
function refreshUserUI() {
  refreshProfileSidebar();
}

/* -----------------------------------
   USER LOGOUT HOOK
------------------------------------ */
function onUserCleared() {
  // clear UI if needed
}

/* -----------------------------------
   APP INITIALIZATION
------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  // 1. Setup navigation
  setupViewSwitching();

  // 2. Initialize Firebase Auth FIRST
  initAuth({
    onUserReady: () => {
      // 3. Init modules AFTER we have a logged in user
      initProfile();
      initFeed();
      initHighlights();
      initDiscover();
      initChat();

      // Greeting
      const greeting = document.getElementById("user-greeting");
      if (greeting && state.currentUserProfile) {
        greeting.textContent = `Welcome, ${state.currentUserProfile.name}`;
        greeting.classList.remove("hidden");
      }

      // realtime
      startRealtime();

      // Notifications
      initNotifications();
    },

    onUserCleared,
    refreshUserUI,
    startRealtime,
  });
});
