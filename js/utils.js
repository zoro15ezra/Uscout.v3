
// js/utils.js
export function escapeHtml(str = "") {
  return str
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatTime(date) {
  if (!date) return "Just now";
  try {
    const d = date instanceof Date ? date : date.toDate?.() ?? new Date(date);
    return d.toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Just now";
  }
}

export function show(el) {
  if (!el) return;
  el.classList.remove("hidden");
}

export function hide(el) {
  if (!el) return;
  el.classList.add("hidden");
}

export function toggleModal(modal, open) {
  if (!modal) return;
  if (open) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  } else {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

export function copyToClipboard(text) {
  if (!navigator.clipboard) return;
  navigator.clipboard.writeText(text).catch(() => {});
}
