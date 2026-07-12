const { getPool } = require("../config/db");

async function findByEmail(email) {
  const [rows] = await getPool().query(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await getPool().query(
    "SELECT id, full_name, email, role, status, created_at FROM users WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

async function listUsers() {
  const [rows] = await getPool().query(
    "SELECT id, full_name, email, role, status FROM users WHERE status = 'Active' ORDER BY full_name ASC"
  );
  return rows;
}

async function createUser(payload) {
  const { fullName, email, passwordHash, role = "employee" } = payload;

  const [result] = await getPool().query(
    "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)",
    [fullName, email, passwordHash, role]
  );

  return findById(result.insertId);
}

async function updatePassword(userId, passwordHash) {
  await getPool().query("UPDATE users SET password_hash = ? WHERE id = ?", [
    passwordHash,
    userId
  ]);
}

async function createPasswordResetToken(userId, token, expiresAt) {
  await getPool().query(
    "DELETE FROM password_reset_tokens WHERE user_id = ? AND used_at IS NULL",
    [userId]
  );

  await getPool().query(
    "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
    [userId, token, expiresAt]
  );
}

async function findValidResetToken(token) {
  const [rows] = await getPool().query(
    `SELECT prt.id, prt.user_id, prt.token, prt.expires_at, u.email, u.full_name
     FROM password_reset_tokens prt
     INNER JOIN users u ON u.id = prt.user_id
     WHERE prt.token = ? AND prt.used_at IS NULL AND prt.expires_at > NOW()
     LIMIT 1`,
    [token]
  );

  return rows[0] || null;
}

async function markResetTokenUsed(tokenId) {
  await getPool().query(
    "UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?",
    [tokenId]
  );
}

module.exports = {
  findByEmail,
  findById,
  listUsers,
  createUser,
  updatePassword,
  createPasswordResetToken,
  findValidResetToken,
  markResetTokenUsed
};
