const { getPool } = require("../config/db");

async function listRoles() {
  const [rows] = await getPool().query(
    `SELECT id, role_code, role_name, description, status, created_at, updated_at
     FROM roles
     ORDER BY role_name ASC`
  );
  return rows;
}

async function getRoleById(id) {
  const [rows] = await getPool().query("SELECT * FROM roles WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function createRole(payload) {
  const { code, name, description = "" } = payload;
  const [result] = await getPool().query(
    "INSERT INTO roles (role_code, role_name, description) VALUES (?, ?, ?)",
    [code, name, description]
  );
  return getRoleById(result.insertId);
}

async function updateRole(id, payload) {
  const { code, name, description = "", status = "Active" } = payload;
  await getPool().query(
    "UPDATE roles SET role_code = ?, role_name = ?, description = ?, status = ? WHERE id = ?",
    [code, name, description, status, id]
  );
  return getRoleById(id);
}

async function softDeleteRole(id) {
  await getPool().query("UPDATE roles SET status = 'Inactive' WHERE id = ?", [id]);
}

module.exports = {
  listRoles,
  getRoleById,
  createRole,
  updateRole,
  softDeleteRole
};
