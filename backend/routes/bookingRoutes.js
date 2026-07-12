const express = require("express");
const bookingController = require("../controllers/bookingController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get("/summary", protect, wrap(bookingController.getSummary));
router.get("/", protect, wrap(bookingController.listBookings));
router.post("/", protect, wrap(bookingController.createBooking));
router.put("/:id", protect, wrap(bookingController.updateBooking));
router.patch("/:id/status", protect, wrap(bookingController.setBookingStatus));

module.exports = router;
