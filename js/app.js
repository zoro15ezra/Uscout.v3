// js/app.js
import { state } from "./firebase.js";
import { initAuth } from "./auth.js";
import {
  initProfile,
  listenToUsers,
  refreshProfileSidebar,
  viewUserProfile,
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

function onUserCleared() {}

document.addEventListener("DOMContentLoaded", () => {
  // Initialize modules
  initProfile();
  initFeed();
  initHighlights();
  initDiscover();
  initChat();
  setupViewSwitching();

  // Floating Glassy Button
  const floatingBtn = document.getElementById("floating-profile-btn");
  if (floatingBtn) {
    floatingBtn.addEventListener("click", () => {
      if (navigator.vibrate) navigator.vibrate([10]);
      if (state.currentUserId) viewUserProfile(state.currentUserId);
    });
  }

  // Collapsed Sidebar Button
  const sidebarProfileBtn = document.getElementById("sidebar-profile-btn");
  if (sidebarProfileBtn) {
    sidebarProfileBtn.addEventListener("click", () => {
      if (navigator.vibrate) navigator.vibrate([10]);
      if (state.currentUserId) viewUserProfile(state.currentUserId);
    });
  }

  // Auth
  initAuth({
    onUserReady: () => {
      const greeting = document.getElementById("user-greeting");
      if (greeting && state.currentUserProfile) {
        greeting.textContent = `Welcome, ${state.currentUserProfile.name}`;
        greeting.classList.remove("hidden");
      }
      initNotifications();
    },

    onUserCleared,
    refreshUserUI,
    startRealtime,
  });
});
