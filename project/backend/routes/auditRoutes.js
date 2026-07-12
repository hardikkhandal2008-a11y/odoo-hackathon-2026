const express = require("express");
const auditController = require("../controllers/auditController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get("/summary", protect, wrap(auditController.getSummary));
router.get("/", protect, wrap(auditController.listAudits));
router.post("/", protect, wrap(auditController.createAudit));
router.put("/:id", protect, wrap(auditController.updateAudit));
router.patch("/:id/status", protect, wrap(auditController.setAuditStatus));

module.exports = router;
