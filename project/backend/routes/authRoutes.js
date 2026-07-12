const express = require("express");
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.post("/register", wrap(authController.register));
router.post("/login", wrap(authController.login));
router.post("/logout", protect, wrap(authController.logout));
router.post("/forgot-password", wrap(authController.forgotPassword));
router.post("/reset-password", wrap(authController.resetPassword));
router.get("/me", protect, wrap(authController.me));
router.get("/users", protect, wrap(authController.listUsers));

module.exports = router;
