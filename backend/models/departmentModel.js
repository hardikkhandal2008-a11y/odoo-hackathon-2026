const { getPool } = require("../config/db");

async function listDepartments() {
  const [rows] = await getPool().query(
    `SELECT
      id,
      department_code,
      department_name,
      department_head,
      employee_count,
      location,
      description,
      status,
      created_at,
      updated_at
    FROM departments
    ORDER BY department_name ASC`
  );
  return rows;
}

async function getDepartmentById(id) {
  const [rows] = await getPool().query(
    "SELECT * FROM departments WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

async function getSummary() {
  const [[summary]] = await getPool().query(
    `SELECT
      COUNT(DISTINCT d.id) AS totalDepartments,
      COALESCE((
        SELECT COUNT(*) FROM employees e WHERE e.status = 'Active'
      ), 0) AS totalEmployees,
      COUNT(DISTINCT d.department_head) AS managers,
      COUNT(DISTINCT d.location) AS locations
    FROM departments d
    WHERE d.status = 'Active'`
  );
  return summary;
}

async function createDepartment(payload) {
  const { code, name, head, location, description, employeeCount = 0 } = payload;

  const [result] = await getPool().query(
    `INSERT INTO departments
      (department_code, department_name, department_head, employee_count, location, description)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [code, name, head, employeeCount, location, description]
  );

  return getDepartmentById(result.insertId);
}

async function updateDepartment(id, payload) {
  const { code, name, head, location, description, employeeCount = 0, status = "Active" } = payload;

  await getPool().query(
    `UPDATE departments
    SET department_code = ?, department_name = ?, department_head = ?, employee_count = ?, location = ?, description = ?, status = ?
    WHERE id = ?`,
    [code, name, head, employeeCount, location, description, status, id]
  );

  return getDepartmentById(id);
}

async function softDeleteDepartment(id) {
  await getPool().query(
    "UPDATE departments SET status = 'Inactive' WHERE id = ?",
    [id]
  );
}

module.exports = {
  listDepartments,
  getDepartmentById,
  getSummary,
  createDepartment,
  updateDepartment,
  softDeleteDepartment
};
