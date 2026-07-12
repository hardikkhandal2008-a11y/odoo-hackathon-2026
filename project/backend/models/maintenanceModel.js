const { getPool } = require("../config/db");

async function listMaintenanceRequests() {
  const [rows] = await getPool().query(
    `SELECT
      id,
      request_code,
      asset_id,
      asset_name,
      maintenance_type,
      requested_by,
      maintenance_date,
      issue_description,
      status,
      technician_name,
      created_at,
      updated_at
    FROM maintenance_requests
    ORDER BY maintenance_date DESC, id DESC`
  );
  return rows;
}

async function getMaintenanceRequestById(id) {
  const [rows] = await getPool().query(
    "SELECT * FROM maintenance_requests WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

async function getSummary() {
  const [[summary]] = await getPool().query(
    `SELECT
      COUNT(*) AS totalRequests,
      SUM(CASE WHEN status = 'Scheduled' THEN 1 ELSE 0 END) AS scheduled,
      SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS inProgress,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed
    FROM maintenance_requests`
  );
  return summary;
}

async function createMaintenanceRequest(payload) {
  const {
    code,
    assetId,
    assetName,
    maintenanceType,
    requestedBy,
    maintenanceDate,
    issueDescription,
    technicianName = null,
    status = "Scheduled"
  } = payload;

  const [result] = await getPool().query(
    `INSERT INTO maintenance_requests
      (request_code, asset_id, asset_name, maintenance_type, requested_by, maintenance_date, issue_description, status, technician_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [code, assetId, assetName, maintenanceType, requestedBy, maintenanceDate, issueDescription, status, technicianName]
  );

  return getMaintenanceRequestById(result.insertId);
}

async function updateMaintenanceRequest(id, payload) {
  const {
    maintenanceType,
    requestedBy,
    maintenanceDate,
    issueDescription,
    technicianName = null,
    status = "Scheduled"
  } = payload;

  await getPool().query(
    `UPDATE maintenance_requests
    SET maintenance_type = ?, requested_by = ?, maintenance_date = ?, issue_description = ?, technician_name = ?, status = ?
    WHERE id = ?`,
    [maintenanceType, requestedBy, maintenanceDate, issueDescription, technicianName, status, id]
  );

  return getMaintenanceRequestById(id);
}

async function setMaintenanceStatus(id, status, technicianName = null) {
  await getPool().query(
    "UPDATE maintenance_requests SET status = ?, technician_name = COALESCE(?, technician_name) WHERE id = ?",
    [status, technicianName, id]
  );

  return getMaintenanceRequestById(id);
}

module.exports = {
  listMaintenanceRequests,
  getMaintenanceRequestById,
  getSummary,
  createMaintenanceRequest,
  updateMaintenanceRequest,
  setMaintenanceStatus
};
