const express = require("express");
const assetController = require("../controllers/assetController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get("/summary", protect, wrap(assetController.getSummary));
router.get("/", protect, wrap(assetController.listAssets));
router.get("/:id", protect, wrap(assetController.getAsset));
router.post("/", protect, wrap(assetController.createAsset));
router.put("/:id", protect, wrap(assetController.updateAsset));
router.delete("/:id", protect, wrap(assetController.deleteAsset));

module.exports = router;
