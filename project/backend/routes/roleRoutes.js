const express = require("express");
const roleController = require("../controllers/roleController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get("/", protect, wrap(roleController.listRoles));
router.get("/:id", protect, wrap(roleController.getRole));
router.post("/", protect, wrap(roleController.createRole));
router.put("/:id", protect, wrap(roleController.updateRole));
router.delete("/:id", protect, wrap(roleController.deleteRole));

module.exports = router;
