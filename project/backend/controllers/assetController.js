const assetModel = require("../models/assetModel");
const notificationModel = require("../models/notificationModel");

function generateCode(prefix) {
  return `${prefix}${String(Date.now()).slice(-6)}`;
}

async function listAssets(req, res) {
  const assets = await assetModel.listAssets({
    search: req.query.search || "",
    category: req.query.category || "",
    status: req.query.status || "",
    bookable: req.query.bookable === "true"
  });

  return res.json(assets);
}

async function getAsset(req, res) {
  const asset = await assetModel.getAssetById(req.params.id);

  if (!asset) {
    return res.status(404).json({ message: "Asset not found." });
  }

  return res.json(asset);
}

async function getSummary(req, res) {
  const summary = await assetModel.getSummary();
  return res.json(summary);
}

async function createAsset(req, res) {
  const {
    assetCode,
    name,
    category,
    assignedTo,
    status,
    department,
    isBookable,
    description
  } = req.body;

  if (!name || !category) {
    return res.status(400).json({ message: "Asset name and category are required." });
  }

  const asset = await assetModel.createAsset({
    assetCode: assetCode?.trim() || generateCode("AF"),
    name: name.trim(),
    category: category.trim(),
    assignedTo: assignedTo?.trim() || "Available",
    status: status || "Available",
    department: department?.trim() || "Store",
    isBookable: String(isBookable) === "true" || isBookable === true,
    description: (description || "").trim()
  });

  await notificationModel.createNotification({
    category: "Assets",
    message: `Asset ${asset.asset_code} - ${asset.name} was registered.`,
    priority: "Low"
  });

  return res.status(201).json(asset);
}

async function updateAsset(req, res) {
  const existing = await assetModel.getAssetById(req.params.id);

  if (!existing) {
    return res.status(404).json({ message: "Asset not found." });
  }

  const asset = await assetModel.updateAsset(req.params.id, {
    assetCode: req.body.assetCode?.trim() || existing.asset_code,
    name: req.body.name?.trim() || existing.name,
    category: req.body.category?.trim() || existing.category,
    assignedTo: req.body.assignedTo?.trim() || existing.assigned_to,
    status: req.body.status || existing.status,
    department: req.body.department?.trim() || existing.department,
    isBookable: req.body.isBookable ?? existing.is_bookable,
    description: (req.body.description ?? existing.description ?? "").trim()
  });

  await notificationModel.createNotification({
    category: "Assets",
    message: `Asset ${asset.asset_code} - ${asset.name} was updated.`,
    priority: "Low"
  });

  return res.json(asset);
}

async function deleteAsset(req, res) {
  const existing = await assetModel.getAssetById(req.params.id);

  if (!existing) {
    return res.status(404).json({ message: "Asset not found." });
  }

  await assetModel.deleteAsset(req.params.id);
  await notificationModel.createNotification({
    category: "Assets",
    message: `Asset ${existing.asset_code} - ${existing.name} was deleted.`,
    priority: "High"
  });

  return res.json({ message: "Asset deleted successfully." });
}

module.exports = {
  listAssets,
  getAsset,
  getSummary,
  createAsset,
  updateAsset,
  deleteAsset
};
