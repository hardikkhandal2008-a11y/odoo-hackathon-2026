const { getPool } = require("../config/db");

async function listAudits() {
  const [rows] = await getPool().query(
    `SELECT
      id,
      audit_code,
      department_name,
      auditor_name,
      audit_date,
      audit_type,
      remarks,
      assets_checked,
      issues_found,
      status,
      created_at,
      updated_at
    FROM audits
    ORDER BY audit_date DESC, id DESC`
  );
  return rows;
}

async function getAuditById(id) {
  const [rows] = await getPool().query(
    "SELECT * FROM audits WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

async function getSummary() {
  const [[summary]] = await getPool().query(
    `SELECT
      COUNT(*) AS totalAudits,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN issues_found > 0 THEN 1 ELSE 0 END) AS issuesFound
    FROM audits`
  );
  return summary;
}

async function createAudit(payload) {
  const {
    code,
    departmentName,
    auditorName,
    auditDate,
    auditType,
    remarks = "",
    assetsChecked = 0,
    issuesFound = 0,
    status = "Scheduled"
  } = payload;

  const [result] = await getPool().query(
    `INSERT INTO audits
      (audit_code, department_name, auditor_name, audit_date, audit_type, remarks, assets_checked, issues_found, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [code, departmentName, auditorName, auditDate, auditType, remarks, assetsChecked, issuesFound, status]
  );

  return getAuditById(result.insertId);
}

async function updateAudit(id, payload) {
  const {
    departmentName,
    auditorName,
    auditDate,
    auditType,
    remarks = "",
    assetsChecked = 0,
    issuesFound = 0,
    status = "Scheduled"
  } = payload;

  await getPool().query(
    `UPDATE audits
    SET department_name = ?, auditor_name = ?, audit_date = ?, audit_type = ?, remarks = ?, assets_checked = ?, issues_found = ?, status = ?
    WHERE id = ?`,
    [departmentName, auditorName, auditDate, auditType, remarks, assetsChecked, issuesFound, status, id]
  );

  return getAuditById(id);
}

async function setAuditStatus(id, status) {
  await getPool().query(
    "UPDATE audits SET status = ? WHERE id = ?",
    [status, id]
  );

  return getAuditById(id);
}

module.exports = {
  listAudits,
  getAuditById,
  getSummary,
  createAudit,
  updateAudit,
  setAuditStatus
};
