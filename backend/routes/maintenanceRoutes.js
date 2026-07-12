const express = require("express");
const maintenanceController = require("../controllers/maintenanceController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get("/summary", protect, wrap(maintenanceController.getSummary));
router.get("/", protect, wrap(maintenanceController.listMaintenanceRequests));
router.post("/", protect, wrap(maintenanceController.createMaintenanceRequest));
router.put("/:id", protect, wrap(maintenanceController.updateMaintenanceRequest));
router.patch("/:id/status", protect, wrap(maintenanceController.setMaintenanceStatus));

module.exports = router;
