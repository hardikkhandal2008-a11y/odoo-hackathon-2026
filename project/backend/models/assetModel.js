const { getPool } = require("../config/db");

function buildFilters(filters = {}) {
  const conditions = [];
  const values = [];

  if (filters.search) {
    conditions.push("(asset_code LIKE ? OR name LIKE ? OR category LIKE ? OR department LIKE ?)");
    const keyword = `%${filters.search}%`;
    values.push(keyword, keyword, keyword, keyword);
  }

  if (filters.category && filters.category !== "All Categories") {
    conditions.push("category = ?");
    values.push(filters.category);
  }

  if (filters.status && filters.status !== "All Status") {
    conditions.push("status = ?");
    values.push(filters.status);
  }

  if (filters.bookable === true) {
    conditions.push("is_bookable = 1");
  }

  return {
    whereClause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    values
  };
}

async function listAssets(filters = {}) {
  const { whereClause, values } = buildFilters(filters);
  const [rows] = await getPool().query(
    `SELECT
      id,
      asset_code,
      name,
      category,
      assigned_to,
      status,
      department,
      is_bookable,
      description,
      created_at,
      updated_at
    FROM assets
    ${whereClause}
    ORDER BY created_at DESC`,
    values
  );
  return rows;
}

async function getAssetById(id) {
  const [rows] = await getPool().query(
    "SELECT * FROM assets WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

async function getSummary() {
  const [[summary]] = await getPool().query(
    `SELECT
      COUNT(*) AS totalAssets,
      SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) AS available,
      SUM(CASE WHEN status = 'Allocated' THEN 1 ELSE 0 END) AS allocated,
      SUM(CASE WHEN status = 'Maintenance' THEN 1 ELSE 0 END) AS maintenance,
      SUM(CASE WHEN status = 'Retired' THEN 1 ELSE 0 END) AS retired
    FROM assets`
  );
  return summary;
}

async function createAsset(payload) {
  const {
    assetCode,
    name,
    category,
    assignedTo = "Available",
    status = "Available",
    department = "Store",
    isBookable = false,
    description = ""
  } = payload;

  const [result] = await getPool().query(
    `INSERT INTO assets
      (asset_code, name, category, assigned_to, status, department, is_bookable, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      assetCode,
      name,
      category,
      assignedTo,
      status,
      department,
      isBookable ? 1 : 0,
      description
    ]
  );

  return getAssetById(result.insertId);
}

async function updateAsset(id, payload) {
  const {
    assetCode,
    name,
    category,
    assignedTo,
    status,
    department,
    isBookable,
    description = ""
  } = payload;

  await getPool().query(
    `UPDATE assets
    SET asset_code = ?, name = ?, category = ?, assigned_to = ?, status = ?, department = ?, is_bookable = ?, description = ?
    WHERE id = ?`,
    [
      assetCode,
      name,
      category,
      assignedTo,
      status,
      department,
      isBookable ? 1 : 0,
      description,
      id
    ]
  );

  return getAssetById(id);
}

async function deleteAsset(id) {
  await getPool().query("DELETE FROM assets WHERE id = ?", [id]);
}

async function markAssetStatus(id, status, assignedTo = "Available") {
  await getPool().query(
    "UPDATE assets SET status = ?, assigned_to = ? WHERE id = ?",
    [status, assignedTo, id]
  );
  return getAssetById(id);
}

module.exports = {
  listAssets,
  getAssetById,
  getSummary,
  createAsset,
  updateAsset,
  deleteAsset,
  markAssetStatus
};
