const express = require("express");
const { db } = require("../config/firebase");
const { authenticateFirebaseToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/profile", authenticateFirebaseToken, async (req, res) => {
  const profile = req.body && typeof req.body === "object" ? req.body : {};
  const name = typeof profile.name === "string" ? profile.name.trim() : "";
  const email = req.user.email;

  if (!name || !email) {
    return res.status(400).json({ error: "A name and authenticated email are required." });
  }

  await db.collection("users").doc(req.user.uid).set({ name, email }, { merge: true });
  return res.status(200).json({ userId: req.user.uid, name, email });
});

module.exports = router;