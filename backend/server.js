require("dotenv").config();

const cors = require("cors");
const express = require("express");
const { db } = require("./config/firebase");
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");

const app = express();
const port = Number(process.env.PORT) || 3000;
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5500")
  .split(",")
  .map((origin) => origin.trim());

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("This frontend origin is not allowed by CORS."));
  }
}));
app.use(express.json({ limit: "20kb" }));

app.get("/api/health", (req, res) => {
  res.status(200).json({ message: "Student Task Management API is running." });
});
app.get("/api/health/database", async (req, res) => {
  try {
    await db.doc("_health/database").get();
    return res.status(200).json({ message: "Firestore connection is available." });
  } catch (error) {
    console.error("Firestore health check failed:", error.message);
    return res.status(503).json({ error: "Firestore is unavailable." });
  }
});
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) {
    return next(error);
  }
  return res.status(500).json({ error: "An unexpected server error occurred." });
});

app.listen(port, () => {
  console.log(`Student Task Management API listening on port ${port}`);
});