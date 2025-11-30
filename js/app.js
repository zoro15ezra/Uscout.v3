
// js/app.js
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
      if (v === view) {
        btn.classList.add("active-nav");
      } else {
        btn.classList.remove("active-nav");
      }
    });
  }

  buttons.forEach((btn) => {
    const v = btn.getAttribute("data-view");
    btn.addEventListener("click", () => switchView(v));
  });

  document.querySelectorAll(".go-feed-btn").forEach((btn) =>
    btn.addEventListener("click", () => switchView("feed"))
  );

  switchView("home");
  window.__switchView = switchView;
}

function startRealtime() {
  listenToUsers(() => {
    renderDiscover();
  });
  startDmListener();
}

function refreshUserUI() {
  refreshProfileSidebar();
}

function onUserCleared() {
  // Optional: clear local UI
}

document.addEventListener("DOMContentLoaded", () => {
  initProfile();
  initFeed();
  initHighlights();
  initDiscover();
  initChat();
  setupViewSwitching();

  initAuth({
    onUserReady: () => {
      const greeting = document.getElementById("user-greeting");
      if (greeting && state.currentUserProfile) {
        greeting.textContent = `Welcome, ${state.currentUserProfile.name}`;
        greeting.classList.remove("hidden");
      }
      // Initialize push notifications after login
      initNotifications();
    },
    onUserCleared,
    refreshUserUI,
    startRealtime,
  });
});
