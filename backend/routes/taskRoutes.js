const express = require("express");
const taskController = require("../controllers/taskController");
const { authenticateFirebaseToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateFirebaseToken);
router.post("/", taskController.createTask);
router.get("/", taskController.getTasks);
router.get("/:taskId", taskController.getTask);
router.put("/:taskId", taskController.updateTask);
router.delete("/:taskId", taskController.deleteTask);
router.patch("/:taskId/complete", taskController.completeTask);

module.exports = router;