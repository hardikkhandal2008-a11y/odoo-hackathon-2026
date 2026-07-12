const bookingModel = require("../models/bookingModel");
const assetModel = require("../models/assetModel");
const notificationModel = require("../models/notificationModel");

function generateCode() {
  return `BK${String(Date.now()).slice(-6)}`;
}

async function listBookings(req, res) {
  const bookings = await bookingModel.listBookings();
  return res.json(bookings);
}

async function getSummary(req, res) {
  const summary = await bookingModel.getSummary();
  return res.json(summary);
}

async function createBooking(req, res) {
  const { assetId, employeeName, bookingDate, purpose, startTime, endTime, remarks, status } = req.body;

  if (!assetId || !employeeName || !bookingDate || !purpose || !startTime || !endTime) {
    return res.status(400).json({ message: "Resource, employee, date, purpose, start time, and end time are required." });
  }

  const asset = await assetModel.getAssetById(assetId);

  if (!asset) {
    return res.status(404).json({ message: "Selected resource was not found." });
  }

  const booking = await bookingModel.createBooking({
    code: generateCode(),
    assetId: asset.id,
    resourceName: asset.name,
    employeeName: employeeName.trim(),
    bookingDate,
    startTime,
    endTime,
    purpose: purpose.trim(),
    remarks: (remarks || "").trim(),
    status: status || "Pending"
  });

  await notificationModel.createNotification({
    category: "Booking",
    message: `${asset.name} booking created for ${employeeName.trim()}.`,
    priority: "Medium"
  });

  return res.status(201).json(booking);
}

async function updateBooking(req, res) {
  const existing = await bookingModel.getBookingById(req.params.id);

  if (!existing) {
    return res.status(404).json({ message: "Booking not found." });
  }

  const asset = req.body.assetId
    ? await assetModel.getAssetById(req.body.assetId)
    : existing.asset_id
      ? await assetModel.getAssetById(existing.asset_id)
      : null;

  const booking = await bookingModel.updateBooking(req.params.id, {
    assetId: asset?.id || null,
    resourceName: asset?.name || existing.resource_name,
    employeeName: req.body.employeeName?.trim() || existing.employee_name,
    bookingDate: req.body.bookingDate || existing.booking_date,
    startTime: req.body.startTime || existing.start_time,
    endTime: req.body.endTime || existing.end_time,
    purpose: req.body.purpose?.trim() || existing.purpose,
    remarks: (req.body.remarks ?? existing.remarks ?? "").trim(),
    status: req.body.status || existing.status
  });

  await notificationModel.createNotification({
    category: "Booking",
    message: `Booking ${booking.booking_code} was updated.`,
    priority: "Low"
  });

  return res.json(booking);
}

async function setBookingStatus(req, res) {
  const existing = await bookingModel.getBookingById(req.params.id);

  if (!existing) {
    return res.status(404).json({ message: "Booking not found." });
  }

  const nextStatus = req.body.status;

  if (!nextStatus) {
    return res.status(400).json({ message: "Booking status is required." });
  }

  const booking = await bookingModel.setBookingStatus(req.params.id, nextStatus);
  await notificationModel.createNotification({
    category: "Booking",
    message: `${existing.resource_name} booking changed to ${nextStatus}.`,
    priority: nextStatus === "Rejected" ? "High" : "Medium"
  });

  return res.json(booking);
}

module.exports = {
  listBookings,
  getSummary,
  createBooking,
  updateBooking,
  setBookingStatus
};
