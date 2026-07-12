const notificationModel = require("../models/notificationModel");

async function listNotifications(req, res) {
  const notifications = await notificationModel.listNotifications({
    category: req.query.category || "All",
    status: req.query.status || "All"
  });

  return res.json(notifications);
}

async function getSummary(req, res) {
  const summary = await notificationModel.getSummary();
  return res.json(summary);
}

async function markAsRead(req, res) {
  await notificationModel.markAsRead(req.params.id);
  return res.json({ message: "Notification marked as read." });
}

async function markAllAsRead(req, res) {
  await notificationModel.markAllAsRead();
  return res.json({ message: "All notifications marked as read." });
}

async function deleteNotification(req, res) {
  await notificationModel.deleteNotification(req.params.id);
  return res.json({ message: "Notification deleted successfully." });
}

module.exports = {
  listNotifications,
  getSummary,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
