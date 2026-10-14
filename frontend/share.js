import { API_BASE_URL } from "./firebase-config.js";

function formatDueDate(dateValue) {
  const date = new Date(`${dateValue.slice(0, 10)}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

async function loadSharedTask() {
  const message = document.getElementById("shared-task-message");
  const token = new URLSearchParams(window.location.search).get("token");
  if (!token) {
    message.textContent = "This shared task link is invalid or no longer available.";
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/shares/${encodeURIComponent(token)}`);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || "This shared task is unavailable.");
    }

    document.getElementById("shared-task-title").textContent = result.title;
    document.getElementById("shared-task-description").textContent = result.description || "";
    document.getElementById("shared-task-description").hidden = !result.description;
    document.getElementById("shared-task-due").textContent = `Due ${formatDueDate(result.dueDate)}`;

    const status = document.getElementById("shared-task-status");
    status.textContent = result.status;
    status.classList.toggle("is-completed", result.status === "Completed");
    document.getElementById("shared-task-content").hidden = false;
    message.hidden = true;
  } catch (error) {
    message.textContent = error.message;
  }
}

loadSharedTask();
