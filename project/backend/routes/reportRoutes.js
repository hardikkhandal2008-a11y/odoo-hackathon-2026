const express = require("express");
const reportController = require("../controllers/reportController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get("/summary", protect, wrap(reportController.getSummary));
router.get("/distribution", protect, wrap(reportController.getDistribution));
router.get("/export/summary", protect, wrap(reportController.exportSummary));
router.get("/", protect, wrap(reportController.listReports));
router.post("/generate", protect, wrap(reportController.generateReport));
router.get("/:id", protect, wrap(reportController.getReport));
router.get("/:id/download", protect, wrap(reportController.downloadReport));

module.exports = router;
