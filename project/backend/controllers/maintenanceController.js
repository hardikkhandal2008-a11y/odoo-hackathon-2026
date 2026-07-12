const maintenanceModel = require("../models/maintenanceModel");
const assetModel = require("../models/assetModel");
const notificationModel = require("../models/notificationModel");

function generateCode() {
  return `MR${String(Date.now()).slice(-6)}`;
}

async function listMaintenanceRequests(req, res) {
  const requests = await maintenanceModel.listMaintenanceRequests();
  return res.json(requests);
}

async function getSummary(req, res) {
  const summary = await maintenanceModel.getSummary();
  return res.json(summary);
}

async function createMaintenanceRequest(req, res) {
  const { assetId, maintenanceType, requestedBy, maintenanceDate, issueDescription, technicianName, status } = req.body;

  if (!assetId || !maintenanceType || !requestedBy || !maintenanceDate || !issueDescription) {
    return res.status(400).json({ message: "Asset, maintenance type, requester, date, and issue description are required." });
  }

  const asset = await assetModel.getAssetById(assetId);

  if (!asset) {
    return res.status(404).json({ message: "Selected asset not found." });
  }

  const request = await maintenanceModel.createMaintenanceRequest({
    code: generateCode(),
    assetId: asset.id,
    assetName: asset.name,
    maintenanceType: maintenanceType.trim(),
    requestedBy: requestedBy.trim(),
    maintenanceDate,
    issueDescription: issueDescription.trim(),
    technicianName: technicianName?.trim() || null,
    status: status || "Scheduled"
  });

  await assetModel.markAssetStatus(asset.id, "Maintenance", asset.assigned_to);
  await notificationModel.createNotification({
    category: "Maintenance",
    message: `${asset.asset_code} maintenance request has been created.`,
    priority: "High"
  });

  return res.status(201).json(request);
}

async function updateMaintenanceRequest(req, res) {
  const existing = await maintenanceModel.getMaintenanceRequestById(req.params.id);

  if (!existing) {
    return res.status(404).json({ message: "Maintenance request not found." });
  }

  const request = await maintenanceModel.updateMaintenanceRequest(req.params.id, {
    maintenanceType: req.body.maintenanceType?.trim() || existing.maintenance_type,
    requestedBy: req.body.requestedBy?.trim() || existing.requested_by,
    maintenanceDate: req.body.maintenanceDate || existing.maintenance_date,
    issueDescription: req.body.issueDescription?.trim() || existing.issue_description,
    technicianName: req.body.technicianName?.trim() || existing.technician_name,
    status: req.body.status || existing.status
  });

  await notificationModel.createNotification({
    category: "Maintenance",
    message: `Maintenance request ${request.request_code} was updated.`,
    priority: "Low"
  });

  return res.json(request);
}

async function setMaintenanceStatus(req, res) {
  const existing = await maintenanceModel.getMaintenanceRequestById(req.params.id);

  if (!existing) {
    return res.status(404).json({ message: "Maintenance request not found." });
  }

  const status = req.body.status;

  if (!status) {
    return res.status(400).json({ message: "Status is required." });
  }

  const request = await maintenanceModel.setMaintenanceStatus(
    req.params.id,
    status,
    req.body.technicianName?.trim() || null
  );

  if (status === "Completed") {
    await assetModel.markAssetStatus(existing.asset_id, "Available", "Available");
  }

  await notificationModel.createNotification({
    category: "Maintenance",
    message: `${existing.asset_name} maintenance status changed to ${status}.`,
    priority: status === "Completed" ? "Low" : "Medium"
  });

  return res.json(request);
}

module.exports = {
  listMaintenanceRequests,
  getSummary,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  setMaintenanceStatus
};
