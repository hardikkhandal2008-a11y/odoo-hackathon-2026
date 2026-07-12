const { getPool } = require("../config/db");

async function listNotifications(filters = {}) {
  const conditions = [];
  const values = [];

  if (filters.category && filters.category !== "All") {
    conditions.push("category = ?");
    values.push(filters.category);
  }

  if (filters.status && filters.status !== "All") {
    conditions.push("status = ?");
    values.push(filters.status);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await getPool().query(
    `SELECT id, category, message, priority, status, created_at
    FROM notifications
    ${whereClause}
    ORDER BY created_at DESC, id DESC`,
    values
  );

  return rows;
}

async function getSummary() {
  const [[summary]] = await getPool().query(
    `SELECT
      COUNT(*) AS totalNotifications,
      SUM(CASE WHEN status = 'Unread' THEN 1 ELSE 0 END) AS unread,
      SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) AS today,
      SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) AS highPriority
    FROM notifications`
  );
  return summary;
}

async function createNotification(payload) {
  const {
    category,
    message,
    priority = "Medium",
    status = "Unread"
  } = payload;

  const [result] = await getPool().query(
    "INSERT INTO notifications (category, message, priority, status) VALUES (?, ?, ?, ?)",
    [category, message, priority, status]
  );

  return result.insertId;
}

async function markAsRead(id) {
  await getPool().query(
    "UPDATE notifications SET status = 'Read' WHERE id = ?",
    [id]
  );
}

async function markAllAsRead() {
  await getPool().query("UPDATE notifications SET status = 'Read' WHERE status = 'Unread'");
}

async function deleteNotification(id) {
  await getPool().query("DELETE FROM notifications WHERE id = ?", [id]);
}

async function recentActivity(limit = 5) {
  const [rows] = await getPool().query(
    `SELECT id, category, message, priority, status, created_at
    FROM notifications
    ORDER BY created_at DESC, id DESC
    LIMIT ?`,
    [limit]
  );
  return rows;
}

module.exports = {
  listNotifications,
  getSummary,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  recentActivity
};
