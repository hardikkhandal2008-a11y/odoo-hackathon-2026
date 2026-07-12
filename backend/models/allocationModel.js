const { getPool } = require("../config/db");

async function listAllocations() {
  const [rows] = await getPool().query(
    `SELECT
      id,
      allocation_code,
      asset_id,
      asset_code,
      asset_name,
      employee_name,
      department_name,
      allocation_date,
      expected_return_date,
      returned_date,
      status,
      remarks,
      created_at,
      updated_at
    FROM allocations
    ORDER BY allocation_date DESC, id DESC`
  );
  return rows;
}

async function getAllocationById(id) {
  const [rows] = await getPool().query(
    "SELECT * FROM allocations WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

async function getSummary() {
  const [[summary]] = await getPool().query(
    `SELECT
      COUNT(*) AS totalAllocations,
      SUM(CASE WHEN status = 'Allocated' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN status = 'Transferred' THEN 1 ELSE 0 END) AS transfers,
      SUM(CASE WHEN status <> 'Returned' AND expected_return_date IS NOT NULL AND expected_return_date < CURDATE() THEN 1 ELSE 0 END) AS pendingReturns
    FROM allocations`
  );
  return summary;
}

async function createAllocation(payload) {
  const {
    code,
    assetId,
    assetCode,
    assetName,
    employeeName,
    departmentName,
    allocationDate,
    expectedReturnDate,
    remarks = "",
    status = "Allocated"
  } = payload;

  const [result] = await getPool().query(
    `INSERT INTO allocations
      (allocation_code, asset_id, asset_code, asset_name, employee_name, department_name, allocation_date, expected_return_date, remarks, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      code,
      assetId,
      assetCode,
      assetName,
      employeeName,
      departmentName,
      allocationDate,
      expectedReturnDate || null,
      remarks,
      status
    ]
  );

  return getAllocationById(result.insertId);
}

async function updateAllocation(id, payload) {
  const {
    employeeName,
    departmentName,
    allocationDate,
    expectedReturnDate,
    remarks = "",
    status = "Allocated"
  } = payload;

  await getPool().query(
    `UPDATE allocations
    SET employee_name = ?, department_name = ?, allocation_date = ?, expected_return_date = ?, remarks = ?, status = ?
    WHERE id = ?`,
    [employeeName, departmentName, allocationDate, expectedReturnDate || null, remarks, status, id]
  );

  return getAllocationById(id);
}

async function setAllocationStatus(id, status, returnedDate = null) {
  await getPool().query(
    "UPDATE allocations SET status = ?, returned_date = ? WHERE id = ?",
    [status, returnedDate, id]
  );

  return getAllocationById(id);
}

module.exports = {
  listAllocations,
  getAllocationById,
  getSummary,
  createAllocation,
  updateAllocation,
  setAllocationStatus
};
