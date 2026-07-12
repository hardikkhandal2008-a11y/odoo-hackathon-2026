const express = require("express");
const allocationController = require("../controllers/allocationController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get("/summary", protect, wrap(allocationController.getSummary));
router.get("/", protect, wrap(allocationController.listAllocations));
router.post("/", protect, wrap(allocationController.createAllocation));
router.put("/:id", protect, wrap(allocationController.updateAllocation));
router.patch("/:id/return", protect, wrap(allocationController.returnAllocation));
router.patch("/:id/transfer", protect, wrap(allocationController.transferAllocation));

module.exports = router;
