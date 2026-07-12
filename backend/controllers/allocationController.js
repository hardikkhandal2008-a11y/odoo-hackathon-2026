const allocationModel = require("../models/allocationModel");
const assetModel = require("../models/assetModel");
const notificationModel = require("../models/notificationModel");

function generateCode() {
  return `AL${String(Date.now()).slice(-6)}`;
}

async function listAllocations(req, res) {
  const allocations = await allocationModel.listAllocations();
  return res.json(allocations);
}

async function getSummary(req, res) {
  const summary = await allocationModel.getSummary();
  return res.json(summary);
}

async function createAllocation(req, res) {
  const { assetId, employeeName, departmentName, allocationDate, expectedReturnDate, remarks, status } = req.body;

  if (!assetId || !employeeName || !departmentName || !allocationDate) {
    return res.status(400).json({ message: "Asset, employee, department, and allocation date are required." });
  }

  const asset = await assetModel.getAssetById(assetId);

  if (!asset) {
    return res.status(404).json({ message: "Selected asset not found." });
  }

  const allocation = await allocationModel.createAllocation({
    code: generateCode(),
    assetId: asset.id,
    assetCode: asset.asset_code,
    assetName: asset.name,
    employeeName: employeeName.trim(),
    departmentName: departmentName.trim(),
    allocationDate,
    expectedReturnDate,
    remarks: (remarks || "").trim(),
    status: status || "Allocated"
  });

  await assetModel.markAssetStatus(asset.id, "Allocated", employeeName.trim());
  await notificationModel.createNotification({
    category: "Assets",
    message: `${asset.asset_code} has been allocated to ${employeeName.trim()}.`,
    priority: "Medium"
  });

  return res.status(201).json(allocation);
}

async function updateAllocation(req, res) {
  const existing = await allocationModel.getAllocationById(req.params.id);

  if (!existing) {
    return res.status(404).json({ message: "Allocation not found." });
  }

  const allocation = await allocationModel.updateAllocation(req.params.id, {
    employeeName: req.body.employeeName?.trim() || existing.employee_name,
    departmentName: req.body.departmentName?.trim() || existing.department_name,
    allocationDate: req.body.allocationDate || existing.allocation_date,
    expectedReturnDate: req.body.expectedReturnDate ?? existing.expected_return_date,
    remarks: (req.body.remarks ?? existing.remarks ?? "").trim(),
    status: req.body.status || existing.status
  });

  await assetModel.markAssetStatus(existing.asset_id, "Allocated", allocation.employee_name);
  await notificationModel.createNotification({
    category: "Assets",
    message: `Allocation ${allocation.allocation_code} was updated.`,
    priority: "Low"
  });

  return res.json(allocation);
}

async function returnAllocation(req, res) {
  const existing = await allocationModel.getAllocationById(req.params.id);

  if (!existing) {
    return res.status(404).json({ message: "Allocation not found." });
  }

  const allocation = await allocationModel.setAllocationStatus(req.params.id, "Returned", new Date().toISOString().slice(0, 10));
  await assetModel.markAssetStatus(existing.asset_id, "Available", "Available");
  await notificationModel.createNotification({
    category: "Assets",
    message: `${existing.asset_code} has been returned by ${existing.employee_name}.`,
    priority: "Medium"
  });

  return res.json(allocation);
}

async function transferAllocation(req, res) {
  const existing = await allocationModel.getAllocationById(req.params.id);

  if (!existing) {
    return res.status(404).json({ message: "Allocation not found." });
  }

  const allocation = await allocationModel.setAllocationStatus(req.params.id, "Transferred");
  await notificationModel.createNotification({
    category: "Assets",
    message: `${existing.asset_code} transfer has been marked pending.`,
    priority: "High"
  });

  return res.json(allocation);
}

module.exports = {
  listAllocations,
  getSummary,
  createAllocation,
  updateAllocation,
  returnAllocation,
  transferAllocation
};
