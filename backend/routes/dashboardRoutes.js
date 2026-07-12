const express = require("express");
const dashboardController = require("../controllers/dashboardController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get("/summary", protect, wrap(dashboardController.getSummary));
router.get("/activity", protect, wrap(dashboardController.getRecentActivity));

module.exports = router;
