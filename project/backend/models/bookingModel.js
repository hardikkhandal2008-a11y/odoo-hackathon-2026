const { getPool } = require("../config/db");

async function listBookings() {
  const [rows] = await getPool().query(
    `SELECT
      id,
      booking_code,
      asset_id,
      resource_name,
      employee_name,
      booking_date,
      start_time,
      end_time,
      purpose,
      remarks,
      status,
      created_at,
      updated_at
    FROM bookings
    ORDER BY booking_date DESC, start_time ASC, id DESC`
  );
  return rows;
}

async function getBookingById(id) {
  const [rows] = await getPool().query(
    "SELECT * FROM bookings WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

async function getSummary() {
  const [[summary]] = await getPool().query(
    `SELECT
      (SELECT COUNT(*) FROM assets WHERE is_bookable = 1) AS totalResources,
      (SELECT COUNT(*) FROM assets WHERE is_bookable = 1 AND status = 'Available') AS available,
      SUM(CASE WHEN booking_date = CURDATE() THEN 1 ELSE 0 END) AS bookedToday,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pendingRequests
    FROM bookings`
  );
  return summary;
}

async function createBooking(payload) {
  const {
    code,
    assetId = null,
    resourceName,
    employeeName,
    bookingDate,
    startTime,
    endTime,
    purpose,
    remarks = "",
    status = "Pending"
  } = payload;

  const [result] = await getPool().query(
    `INSERT INTO bookings
      (booking_code, asset_id, resource_name, employee_name, booking_date, start_time, end_time, purpose, remarks, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [code, assetId, resourceName, employeeName, bookingDate, startTime, endTime, purpose, remarks, status]
  );

  return getBookingById(result.insertId);
}

async function updateBooking(id, payload) {
  const {
    assetId = null,
    resourceName,
    employeeName,
    bookingDate,
    startTime,
    endTime,
    purpose,
    remarks = "",
    status = "Pending"
  } = payload;

  await getPool().query(
    `UPDATE bookings
    SET asset_id = ?, resource_name = ?, employee_name = ?, booking_date = ?, start_time = ?, end_time = ?, purpose = ?, remarks = ?, status = ?
    WHERE id = ?`,
    [assetId, resourceName, employeeName, bookingDate, startTime, endTime, purpose, remarks, status, id]
  );

  return getBookingById(id);
}

async function setBookingStatus(id, status) {
  await getPool().query(
    "UPDATE bookings SET status = ? WHERE id = ?",
    [status, id]
  );

  return getBookingById(id);
}

module.exports = {
  listBookings,
  getBookingById,
  getSummary,
  createBooking,
  updateBooking,
  setBookingStatus
};
