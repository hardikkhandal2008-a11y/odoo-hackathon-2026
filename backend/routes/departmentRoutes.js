const express = require("express");
const departmentController = require("../controllers/departmentController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get("/summary", protect, wrap(departmentController.getSummary));
router.get("/", protect, wrap(departmentController.listDepartments));
router.get("/:id", protect, wrap(departmentController.getDepartment));
router.post("/", protect, wrap(departmentController.createDepartment));
router.put("/:id", protect, wrap(departmentController.updateDepartment));
router.delete("/:id", protect, wrap(departmentController.deleteDepartment));

module.exports = router;
