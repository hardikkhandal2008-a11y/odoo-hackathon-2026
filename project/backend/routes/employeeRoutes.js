const express = require("express");
const employeeController = require("../controllers/employeeController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get("/", protect, wrap(employeeController.listEmployees));
router.get("/:id", protect, wrap(employeeController.getEmployee));
router.post("/", protect, wrap(employeeController.createEmployee));
router.put("/:id", protect, wrap(employeeController.updateEmployee));
router.delete("/:id", protect, wrap(employeeController.deleteEmployee));

module.exports = router;
