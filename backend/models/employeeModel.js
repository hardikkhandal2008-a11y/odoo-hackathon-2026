const { getPool } = require("../config/db");

const employeeSelect = `
  SELECT
    e.id,
    e.employee_code,
    e.full_name,
    e.email,
    e.phone,
    e.department_id,
    e.role_id,
    e.user_id,
    e.status,
    e.hired_at,
    d.department_name,
    d.department_code,
    r.role_name,
    r.role_code
  FROM employees e
  INNER JOIN departments d ON d.id = e.department_id
  INNER JOIN roles r ON r.id = e.role_id
`;

async function listEmployees() {
  const [rows] = await getPool().query(
    `${employeeSelect}
     WHERE e.status = 'Active'
     ORDER BY e.full_name ASC`
  );
  return rows;
}

async function getEmployeeById(id) {
  const [rows] = await getPool().query(`${employeeSelect} WHERE e.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function createEmployee(payload) {
  const { code, fullName, email, phone, departmentId, roleId, userId, hiredAt } = payload;
  const [result] = await getPool().query(
    `INSERT INTO employees
      (employee_code, full_name, email, phone, department_id, role_id, user_id, hired_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [code, fullName, email, phone || null, departmentId, roleId, userId || null, hiredAt || null]
  );
  await syncDepartmentEmployeeCount(departmentId);
  return getEmployeeById(result.insertId);
}

async function updateEmployee(id, payload) {
  const existing = await getEmployeeById(id);
  if (!existing) return null;

  const {
    code = existing.employee_code,
    fullName = existing.full_name,
    email = existing.email,
    phone = existing.phone,
    departmentId = existing.department_id,
    roleId = existing.role_id,
    userId = existing.user_id,
    status = existing.status,
    hiredAt = existing.hired_at
  } = payload;

  await getPool().query(
    `UPDATE employees
     SET employee_code = ?, full_name = ?, email = ?, phone = ?, department_id = ?,
         role_id = ?, user_id = ?, status = ?, hired_at = ?
     WHERE id = ?`,
    [code, fullName, email, phone, departmentId, roleId, userId, status, hiredAt, id]
  );

  if (existing.department_id !== departmentId) {
    await syncDepartmentEmployeeCount(existing.department_id);
  }
  await syncDepartmentEmployeeCount(departmentId);
  return getEmployeeById(id);
}

async function softDeleteEmployee(id) {
  const existing = await getEmployeeById(id);
  if (!existing) return;

  await getPool().query("UPDATE employees SET status = 'Inactive' WHERE id = ?", [id]);
  await syncDepartmentEmployeeCount(existing.department_id);
}

async function syncDepartmentEmployeeCount(departmentId) {
  await getPool().query(
    `UPDATE departments d
     SET employee_count = (
       SELECT COUNT(*) FROM employees e
       WHERE e.department_id = d.id AND e.status = 'Active'
     )
     WHERE d.id = ?`,
    [departmentId]
  );
}

async function syncAllDepartmentCounts() {
  await getPool().query(
    `UPDATE departments d
     SET employee_count = (
       SELECT COUNT(*) FROM employees e
       WHERE e.department_id = d.id AND e.status = 'Active'
     )`
  );
}

module.exports = {
  listEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  softDeleteEmployee,
  syncAllDepartmentCounts
};
