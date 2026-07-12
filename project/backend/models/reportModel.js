const { getPool } = require("../config/db");

async function listReports() {
  const [rows] = await getPool().query(
    `SELECT
      id,
      report_code,
      report_name,
      report_type,
      department_filter,
      from_date,
      to_date,
      generated_by,
      format,
      file_name,
      file_path,
      created_at
    FROM reports
    ORDER BY created_at DESC, id DESC`
  );
  return rows;
}

async function getReportById(id) {
  const [rows] = await getPool().query(
    "SELECT * FROM reports WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

async function createReport(payload) {
  const {
    code,
    reportName,
    reportType,
    departmentFilter,
    fromDate,
    toDate,
    generatedBy,
    format,
    fileName,
    filePath
  } = payload;

  const [result] = await getPool().query(
    `INSERT INTO reports
      (report_code, report_name, report_type, department_filter, from_date, to_date, generated_by, format, file_name, file_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [code, reportName, reportType, departmentFilter, fromDate, toDate, generatedBy, format, fileName, filePath]
  );

  return getReportById(result.insertId);
}

async function getAssetDistribution() {
  const [rows] = await getPool().query(
    `SELECT status, COUNT(*) AS total
    FROM assets
    WHERE status IN ('Allocated', 'Available', 'Maintenance')
    GROUP BY status`
  );
  return rows;
}

async function getSummaryCards() {
  const [[summary]] = await getPool().query(
    `SELECT
      COUNT(*) AS totalAssets,
      SUM(CASE WHEN status = 'Allocated' THEN 1 ELSE 0 END) AS allocated,
      SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS available,
      SUM(CASE WHEN status = 'Maintenance' THEN 1 ELSE 0 END) AS maintenance
    FROM assets`
  );
  return summary;
}

module.exports = {
  listReports,
  getReportById,
  createReport,
  getAssetDistribution,
  getSummaryCards
};
