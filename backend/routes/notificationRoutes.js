const express = require("express");
const notificationController = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get("/summary", protect, wrap(notificationController.getSummary));
router.get("/", protect, wrap(notificationController.listNotifications));
router.patch("/read-all", protect, wrap(notificationController.markAllAsRead));
router.patch("/:id/read", protect, wrap(notificationController.markAsRead));
router.delete("/:id", protect, wrap(notificationController.deleteNotification));

module.exports = router;
