import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { API_BASE_URL, auth } from "./firebase-config.js";

function showError(element, message) {
  element.textContent = message;
  element.hidden = false;
}

function hideError(element) {
  element.textContent = "";
  element.hidden = true;
}

async function apiRequest(path, options = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Please log in again to continue.");
  }

  const token = await user.getIdToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers
    }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || "The request could not be completed.");
  }
  return result;
}

function firebaseErrorMessage(error) {
  const messages = {
    "auth/email-already-in-use": "An account with this email already exists. Please log in.",
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Choose a password with at least 6 characters."
  };
  return messages[error.code] || error.message || "Something went wrong. Please try again.";
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const email = form.elements.email.value.trim().toLowerCase();
  const password = form.elements.password.value;
  const error = document.getElementById("login-error");
  hideError(error);

  if (!email || !password) {
    showError(error, "Enter your email address and password.");
    return;
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const name = credential.user.displayName || email.split("@")[0];
    await apiRequest("/api/auth/profile", {
      method: "POST",
      body: JSON.stringify({ name })
    });
    window.location.href = "dashboard.html";
  } catch (loginError) {
    showError(error, firebaseErrorMessage(loginError));
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const name = form.elements.name.value.trim();
  const email = form.elements.email.value.trim().toLowerCase();
  const password = form.elements.password.value;
  const confirmPassword = form.elements.confirmPassword.value;
  const error = document.getElementById("register-error");
  hideError(error);

  if (password !== confirmPassword) {
    showError(error, "The passwords do not match.");
    return;
  }

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    await apiRequest("/api/auth/profile", {
      method: "POST",
      body: JSON.stringify({ name })
    });
    window.location.href = "dashboard.html";
  } catch (registrationError) {
    showError(error, firebaseErrorMessage(registrationError));
  }
}

function formatDueDate(dateValue) {
  if (!dateValue) return "No due date";
  const date = new Date(`${dateValue}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function normalizeTask(task) {
  return {
    id: task.taskId,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate.slice(0, 10),
    status: task.status.toLowerCase(),
    isShared: task.isShared
  };
}

async function initializeDashboard(user) {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  const userName = user.displayName || user.email.split("@")[0];
  document.getElementById("student-name").textContent = userName;
  document.getElementById("welcome-name").textContent = userName;
  document.getElementById("current-date").textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long", month: "long", day: "numeric", year: "numeric"
  }).format(new Date());

  let tasks = [];
  let activeFilter = "all";
  const list = document.getElementById("task-list");
  const dialog = document.getElementById("task-dialog");
  const form = document.getElementById("task-form");
  const formError = document.getElementById("task-error");

  function renderTasks() {
    const pendingCount = tasks.filter((task) => task.status === "pending").length;
    const completedCount = tasks.filter((task) => task.status === "completed").length;
    document.getElementById("total-count").textContent = tasks.length;
    document.getElementById("pending-count").textContent = pendingCount;
    document.getElementById("completed-count").textContent = completedCount;
    document.getElementById("tasks-summary").textContent = `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} in your study list`;

    const visibleTasks = tasks
      .filter((task) => activeFilter === "all" || task.status === activeFilter)
      .sort((first, second) => first.dueDate.localeCompare(second.dueDate));

    if (visibleTasks.length === 0) {
      const message = activeFilter === "all" ? "Your task list is clear" : `No ${activeFilter} tasks`;
      const detail = activeFilter === "all" ? "Add a task when you are ready to plan your next step." : "Try another filter or add a new task.";
      list.innerHTML = `<div class="empty-state"><strong>${message}</strong><p>${detail}</p></div>`;
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    list.innerHTML = visibleTasks.map((task) => {
      const isCompleted = task.status === "completed";
      const dueDate = new Date(`${task.dueDate}T00:00:00`);
      const isOverdue = !isCompleted && dueDate < today;
      return `
        <article class="task-row" data-task-id="${escapeHtml(task.id)}">
          <div class="task-main">
            <div class="task-title-line">
              <h3 class="task-title">${escapeHtml(task.title)}</h3>
              <span class="status-pill ${isCompleted ? "is-completed" : ""}">${isCompleted ? "Completed" : "Pending"}</span>
            </div>
            ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ""}
            <div class="task-meta"><span class="task-due ${isOverdue ? "is-overdue" : ""}">Due ${escapeHtml(formatDueDate(task.dueDate))}${isOverdue ? " · overdue" : ""}</span></div>
          </div>
          <div class="task-actions">
            <button class="task-action task-action-complete" type="button" data-action="toggle">${isCompleted ? "Reopen" : "Complete"}</button>
            <button class="task-action" type="button" data-action="share">${task.isShared ? "Copy link" : "Share"}</button>
            ${task.isShared ? '<button class="task-action task-action-delete" type="button" data-action="stop-sharing">Stop sharing</button>' : ""}
            <button class="task-action" type="button" data-action="edit">Edit</button>
            <button class="task-action task-action-delete" type="button" data-action="delete">Delete</button>
          </div>
        </article>`;
    }).join("");
  }

  function openTaskForm(task) {
    form.reset();
    hideError(formError);
    document.getElementById("task-id").value = task ? task.id : "";
    document.getElementById("task-title").value = task ? task.title : "";
    document.getElementById("task-description").value = task ? task.description : "";
    document.getElementById("task-due-date").value = task ? task.dueDate : "";
    document.getElementById("task-dialog-title").textContent = task ? "Edit task" : "Add a task";
    dialog.showModal();
    document.getElementById("task-title").focus();
  }

  document.getElementById("add-task-button").addEventListener("click", () => openTaskForm(null));
  document.getElementById("close-dialog-button").addEventListener("click", () => dialog.close());
  document.getElementById("cancel-task-button").addEventListener("click", () => dialog.close());

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((filterButton) => {
        const isActive = filterButton === button;
        filterButton.classList.toggle("is-active", isActive);
        filterButton.setAttribute("aria-pressed", String(isActive));
      });
      renderTasks();
    });
  });

  list.addEventListener("click", async (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const row = actionButton.closest("[data-task-id]");
    const task = tasks.find((item) => item.id === row.dataset.taskId);
    if (!task) return;

    try {
      if (actionButton.dataset.action === "edit") {
        openTaskForm(task);
      } else if (actionButton.dataset.action === "delete") {
        await apiRequest(`/api/tasks/${encodeURIComponent(task.id)}`, { method: "DELETE" });
        await loadTasks();
      } else if (actionButton.dataset.action === "toggle") {
        if (task.status === "completed") {
          await apiRequest(`/api/tasks/${encodeURIComponent(task.id)}`, {
            method: "PUT",
            body: JSON.stringify({ ...task, status: "Pending" })
          });
        } else {
          await apiRequest(`/api/tasks/${encodeURIComponent(task.id)}/complete`, { method: "PATCH" });
        }
        await loadTasks();
      } else if (actionButton.dataset.action === "share") {
        const result = await apiRequest(`/api/tasks/${encodeURIComponent(task.id)}/share`, { method: "POST" });
        const shareUrl = new URL(`share.html?token=${encodeURIComponent(result.token)}`, window.location.href).href;
        try {
          await navigator.clipboard.writeText(shareUrl);
          window.alert("Public task link copied to your clipboard.");
        } catch {
          window.prompt("Copy this public task link:", shareUrl);
        }
        task.isShared = true;
        renderTasks();
      } else if (actionButton.dataset.action === "stop-sharing") {
        if (!window.confirm("Anyone with this link will no longer be able to view the task. Stop sharing?")) {
          return;
        }
        await apiRequest(`/api/tasks/${encodeURIComponent(task.id)}/share`, { method: "DELETE" });
        task.isShared = false;
        renderTasks();
      }
    } catch (requestError) {
      window.alert(requestError.message);
    }
  });

  async function loadTasks() {
    list.innerHTML = '<div class="empty-state"><strong>Loading tasks</strong></div>';
    try {
      const result = await apiRequest("/api/tasks");
      tasks = result.map(normalizeTask);
      renderTasks();
    } catch (requestError) {
      list.innerHTML = `<div class="empty-state"><strong>${escapeHtml(requestError.message)}</strong><p>Check your connection and try refreshing.</p></div>`;
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideError(formError);
    const formData = new FormData(form);
    const title = formData.get("title").trim();
    const dueDate = formData.get("dueDate");
    const description = formData.get("description").trim();
    if (!title || !description || !dueDate) {
      showError(formError, "Add a task title, description, and due date to continue.");
      return;
    }

    const taskId = formData.get("taskId");
    const taskData = {
      title,
      description,
      dueDate
    };

    try {
      if (taskId) {
        const task = tasks.find((item) => item.id === taskId);
        await apiRequest(`/api/tasks/${encodeURIComponent(taskId)}`, {
          method: "PUT",
          body: JSON.stringify({ ...taskData, status: task.status === "completed" ? "Completed" : "Pending" })
        });
      } else {
        await apiRequest("/api/tasks", {
          method: "POST",
          body: JSON.stringify(taskData)
        });
      }
      dialog.close();
      await loadTasks();
    } catch (requestError) {
      showError(formError, requestError.message);
    }
  });

  document.getElementById("logout-button").addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
  });

  loadTasks();
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "login") {
    document.getElementById("login-form").addEventListener("submit", handleLogin);
  } else if (page === "register") {
    document.getElementById("register-form").addEventListener("submit", handleRegister);
  }

  let initialAuthCheck = true;
  let authActionInProgress = false;
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  for (const form of [loginForm, registerForm]) {
    form?.addEventListener("submit", () => { authActionInProgress = true; });
  }

  onAuthStateChanged(auth, (user) => {
    if (page === "index") {
      window.location.replace(user ? "dashboard.html" : "login.html");
    } else if (page === "dashboard") {
      if (initialAuthCheck) {
        initialAuthCheck = false;
        initializeDashboard(user);
      }
    } else if (initialAuthCheck && user && !authActionInProgress) {
      window.location.replace("dashboard.html");
    }
    initialAuthCheck = false;
  });
});