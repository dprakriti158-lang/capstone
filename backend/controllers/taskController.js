const { db } = require("../config/firebase");
const { randomBytes } = require("node:crypto");

const VALID_STATUSES = new Map([
  ["pending", "Pending"],
  ["completed", "Completed"]
]);

function tasksForUser(userId) {
  return db.collection("users").doc(userId).collection("tasks");
}

function isIsoCompatibleDate(value) {
  const datePart = value.slice(0, 10);
  const dateFormat = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/;
  if (!dateFormat.test(value) || Number.isNaN(Date.parse(value))) {
    return false;
  }

  return new Date(`${datePart}T00:00:00.000Z`).toISOString().slice(0, 10) === datePart;
}

function validateTask(body, allowDefaultStatus = false) {
  const taskData = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const title = typeof taskData.title === "string" ? taskData.title.trim() : "";
  const description = typeof taskData.description === "string" ? taskData.description.trim() : "";
  const dueDate = typeof taskData.dueDate === "string" ? taskData.dueDate.trim() : "";
  const statusText = typeof taskData.status === "string" ? taskData.status.trim().toLowerCase() : "";
  const status = statusText ? VALID_STATUSES.get(statusText) : allowDefaultStatus ? "Pending" : null;

  if (!title || !description || !dueDate) {
    return { error: "title, description, and dueDate are required." };
  }
  if (title.length > 100 || description.length > 500) {
    return { error: "title must be 100 characters or fewer and description 500 or fewer." };
  }
  if (!isIsoCompatibleDate(dueDate)) {
    return { error: "dueDate must be a valid ISO-compatible date." };
  }
  if (!status) {
    return { error: "status must be Pending or Completed." };
  }

  return { value: { title, description, dueDate, status } };
}

function serializeTask(document) {
  const task = document.data();
  const { shareToken, ...taskData } = task;
  return {
    taskId: document.id,
    ...taskData,
    isShared: typeof shareToken === "string" && shareToken.length > 0,
    createdAt: task.createdAt && typeof task.createdAt.toDate === "function"
      ? task.createdAt.toDate().toISOString()
      : task.createdAt || null
  };
}

async function createTask(req, res) {
  const validation = validateTask(req.body, true);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const taskRef = tasksForUser(req.user.uid).doc();
  await taskRef.set({
    ...validation.value,
    createdAt: new Date()
  });
  const createdTask = await taskRef.get();
  return res.status(201).json(serializeTask(createdTask));
}

async function getTasks(req, res) {
  const snapshot = await tasksForUser(req.user.uid).orderBy("createdAt", "desc").get();
  return res.status(200).json(snapshot.docs.map(serializeTask));
}

async function getTask(req, res) {
  const task = await tasksForUser(req.user.uid).doc(req.params.taskId).get();
  if (!task.exists) {
    return res.status(404).json({ error: "Task not found." });
  }
  return res.status(200).json(serializeTask(task));
}

async function updateTask(req, res) {
  const validation = validateTask(req.body);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const taskRef = tasksForUser(req.user.uid).doc(req.params.taskId);
  const task = await taskRef.get();
  if (!task.exists) {
    return res.status(404).json({ error: "Task not found." });
  }

  await taskRef.update(validation.value);
  return res.status(200).json(serializeTask(await taskRef.get()));
}

async function deleteTask(req, res) {
  const taskRef = tasksForUser(req.user.uid).doc(req.params.taskId);
  const taskExists = await db.runTransaction(async (transaction) => {
    const task = await transaction.get(taskRef);
    if (!task.exists) {
      return false;
    }

    const token = task.get("shareToken");
    transaction.delete(taskRef);
    if (typeof token === "string" && token) {
      transaction.delete(db.collection("publicShares").doc(token));
    }
    return true;
  });
  if (!taskExists) {
    return res.status(404).json({ error: "Task not found." });
  }

  return res.status(200).json({ message: "Task deleted." });
}

async function completeTask(req, res) {
  const taskRef = tasksForUser(req.user.uid).doc(req.params.taskId);
  const task = await taskRef.get();
  if (!task.exists) {
    return res.status(404).json({ error: "Task not found." });
  }

  await taskRef.update({ status: "Completed" });
  return res.status(200).json(serializeTask(await taskRef.get()));
}

async function createTaskShare(req, res) {
  const taskRef = tasksForUser(req.user.uid).doc(req.params.taskId);
  let token;

  const taskExists = await db.runTransaction(async (transaction) => {
    const task = await transaction.get(taskRef);
    if (!task.exists) {
      return false;
    }

    const existingToken = task.get("shareToken");
    if (typeof existingToken === "string" && existingToken) {
      const existingShareRef = db.collection("publicShares").doc(existingToken);
      const existingShare = await transaction.get(existingShareRef);
      if (existingShare.exists) {
        token = existingToken;
        return true;
      }
    }

    token = randomBytes(32).toString("base64url");
    transaction.update(taskRef, { shareToken: token });
    transaction.set(db.collection("publicShares").doc(token), {
      userId: req.user.uid,
      taskId: req.params.taskId,
      createdAt: new Date()
    });
    return true;
  });

  if (!taskExists) {
    return res.status(404).json({ error: "Task not found." });
  }
  return res.status(200).json({ token });
}

async function revokeTaskShare(req, res) {
  const taskRef = tasksForUser(req.user.uid).doc(req.params.taskId);

  const taskExists = await db.runTransaction(async (transaction) => {
    const task = await transaction.get(taskRef);
    if (!task.exists) {
      return false;
    }

    const token = task.get("shareToken");
    if (typeof token === "string" && token) {
      transaction.delete(db.collection("publicShares").doc(token));
      transaction.update(taskRef, { shareToken: null });
    }
    return true;
  });

  if (!taskExists) {
    return res.status(404).json({ error: "Task not found." });
  }
  return res.status(200).json({ message: "Public link disabled." });
}

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  completeTask,
  createTaskShare,
  revokeTaskShare
};