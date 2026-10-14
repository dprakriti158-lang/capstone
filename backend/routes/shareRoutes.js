const express = require("express");
const { db } = require("../config/firebase");

const router = express.Router();

router.get("/:token", async (req, res) => {
  const { token } = req.params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return res.status(404).json({ error: "This shared task is unavailable." });
  }

  const share = await db.collection("publicShares").doc(token).get();
  if (!share.exists) {
    return res.status(404).json({ error: "This shared task is unavailable." });
  }

  const { userId, taskId } = share.data();
  if (
    typeof userId !== "string" || !userId || userId.includes("/") ||
    typeof taskId !== "string" || !taskId || taskId.includes("/")
  ) {
    return res.status(404).json({ error: "This shared task is unavailable." });
  }

  const task = await db.collection("users").doc(userId).collection("tasks").doc(taskId).get();
  if (!task.exists || task.get("shareToken") !== token) {
    return res.status(404).json({ error: "This shared task is unavailable." });
  }

  const { title, description, dueDate, status } = task.data();
  res.set("Cache-Control", "no-store");
  return res.status(200).json({ title, description, dueDate, status });
});

module.exports = router;
