// js/app.js (FIXED)
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

  // Start on home
  window.__switchView = switchView;
}

/* -----------------------------------
   REALTIME LISTENERS
------------------------------------ */
function startRealtime() {
  // Listen to all users
  listenToUsers(() => {
    renderDiscover();
  });

  // Listen to DMs
  startDmListener();
}

/* -----------------------------------
   USER UI REFRESHER  
------------------------------------ */
function refreshUserUI() {
  refreshProfileSidebar();
}

/* -----------------------------------
   ON USER LOGOUT
------------------------------------ */
function onUserCleared() {
  // Optionally clear UI
}

/* -----------------------------------
   APP INIT
------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  // initialize navigation system
  setupViewSwitching();

  // AUTH FIRST — ONLY after user loads, init rest of the app
  initAuth({
    onUserReady: () => {
      // Initialize UI that needs the user
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

      // Realtime listeners
      startRealtime();

      // Notifications
      initNotifications();
    },

    onUserCleared,
    refreshUserUI,
    startRealtime,
  });
});
