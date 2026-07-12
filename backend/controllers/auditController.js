const auditModel = require("../models/auditModel");
const notificationModel = require("../models/notificationModel");

function generateCode() {
  return `AU${String(Date.now()).slice(-6)}`;
}

async function listAudits(req, res) {
  const audits = await auditModel.listAudits();
  return res.json(audits);
}

async function getSummary(req, res) {
  const summary = await auditModel.getSummary();
  return res.json(summary);
}

async function createAudit(req, res) {
  const { departmentName, auditorName, auditDate, auditType, remarks, assetsChecked, issuesFound, status } = req.body;

  if (!departmentName || !auditorName || !auditDate || !auditType) {
    return res.status(400).json({ message: "Department, auditor, date, and audit type are required." });
  }

  const audit = await auditModel.createAudit({
    code: generateCode(),
    departmentName: departmentName.trim(),
    auditorName: auditorName.trim(),
    auditDate,
    auditType: auditType.trim(),
    remarks: (remarks || "").trim(),
    assetsChecked: Number(assetsChecked || 0),
    issuesFound: Number(issuesFound || 0),
    status: status || "Scheduled"
  });

  await notificationModel.createNotification({
    category: "Audit",
    message: `Audit scheduled for ${audit.department_name}.`,
    priority: "High"
  });

  return res.status(201).json(audit);
}

async function updateAudit(req, res) {
  const existing = await auditModel.getAuditById(req.params.id);

  if (!existing) {
    return res.status(404).json({ message: "Audit not found." });
  }

  const audit = await auditModel.updateAudit(req.params.id, {
    departmentName: req.body.departmentName?.trim() || existing.department_name,
    auditorName: req.body.auditorName?.trim() || existing.auditor_name,
    auditDate: req.body.auditDate || existing.audit_date,
    auditType: req.body.auditType?.trim() || existing.audit_type,
    remarks: (req.body.remarks ?? existing.remarks ?? "").trim(),
    assetsChecked: Number(req.body.assetsChecked ?? existing.assets_checked ?? 0),
    issuesFound: Number(req.body.issuesFound ?? existing.issues_found ?? 0),
    status: req.body.status || existing.status
  });

  await notificationModel.createNotification({
    category: "Audit",
    message: `Audit ${audit.audit_code} was updated.`,
    priority: "Low"
  });

  return res.json(audit);
}

async function setAuditStatus(req, res) {
  const existing = await auditModel.getAuditById(req.params.id);

  if (!existing) {
    return res.status(404).json({ message: "Audit not found." });
  }

  const status = req.body.status;

  if (!status) {
    return res.status(400).json({ message: "Status is required." });
  }

  const audit = await auditModel.setAuditStatus(req.params.id, status);
  await notificationModel.createNotification({
    category: "Audit",
    message: `${existing.department_name} audit status changed to ${status}.`,
    priority: status === "Completed" ? "Low" : "Medium"
  });

  return res.json(audit);
}

module.exports = {
  listAudits,
  getSummary,
  createAudit,
  updateAudit,
  setAuditStatus
};
