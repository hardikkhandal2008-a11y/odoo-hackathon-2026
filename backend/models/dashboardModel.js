const { getPool } = require("../config/db");

async function getSummary() {
  const [[summary]] = await getPool().query(
    `SELECT
      (SELECT COUNT(*) FROM assets WHERE status = 'Available') AS availableAssets,
      (SELECT COUNT(*) FROM assets WHERE status = 'Allocated') AS allocatedAssets,
      (SELECT COUNT(*) FROM assets WHERE is_bookable = 1 AND status = 'Available') AS availableResources,
      (SELECT COUNT(*) FROM bookings WHERE status IN ('Confirmed', 'Booked')) AS activeBookings,
      (SELECT COUNT(*) FROM allocations WHERE status = 'Transferred') AS pendingTransfers,
      (SELECT COUNT(*) FROM allocations WHERE status <> 'Returned' AND expected_return_date IS NOT NULL AND expected_return_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)) AS upcomingReturns,
      (SELECT COUNT(*) FROM allocations WHERE status <> 'Returned' AND expected_return_date IS NOT NULL AND expected_return_date < CURDATE()) AS overdueReturns
    `
  );
  return summary;
}

async function getRecentActivity(limit = 5) {
  const [rows] = await getPool().query(
    `SELECT category, message, created_at
    FROM notifications
    ORDER BY created_at DESC, id DESC
    LIMIT ?`,
    [limit]
  );
  return rows;
}

module.exports = {
  getSummary,
  getRecentActivity
};
