const roleModel = require("../models/roleModel");
const notificationModel = require("../models/notificationModel");

async function listRoles(req, res) {
  return res.json(await roleModel.listRoles());
}

async function getRole(req, res) {
  const role = await roleModel.getRoleById(req.params.id);
  if (!role) return res.status(404).json({ message: "Role not found." });
  return res.json(role);
}

async function createRole(req, res) {
  const { code, name, description } = req.body;
  if (!code?.trim() || !name?.trim()) {
    return res.status(400).json({ message: "Role code and name are required." });
  }

  const role = await roleModel.createRole({
    code: code.trim(),
    name: name.trim(),
    description: (description || "").trim()
  });

  await notificationModel.createNotification({
    category: "System",
    message: `Role ${role.role_name} was created.`,
    priority: "Low"
  });

  return res.status(201).json(role);
}

async function updateRole(req, res) {
  const existing = await roleModel.getRoleById(req.params.id);
  if (!existing) return res.status(404).json({ message: "Role not found." });

  const role = await roleModel.updateRole(req.params.id, {
    code: req.body.code?.trim() || existing.role_code,
    name: req.body.name?.trim() || existing.role_name,
    description: (req.body.description ?? existing.description ?? "").trim(),
    status: req.body.status || existing.status
  });

  return res.json(role);
}

async function deleteRole(req, res) {
  const existing = await roleModel.getRoleById(req.params.id);
  if (!existing) return res.status(404).json({ message: "Role not found." });

  await roleModel.softDeleteRole(req.params.id);
  return res.json({ message: "Role deleted successfully." });
}

module.exports = {
  listRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole
};
