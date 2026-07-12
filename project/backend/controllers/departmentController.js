const departmentModel = require("../models/departmentModel");
const notificationModel = require("../models/notificationModel");

async function listDepartments(req, res) {
  const departments = await departmentModel.listDepartments();
  return res.json(departments);
}

async function getDepartment(req, res) {
  const department = await departmentModel.getDepartmentById(req.params.id);

  if (!department) {
    return res.status(404).json({ message: "Department not found." });
  }

  return res.json(department);
}

async function getSummary(req, res) {
  const summary = await departmentModel.getSummary();
  return res.json(summary);
}

async function createDepartment(req, res) {
  const { code, name, head, location, description, employeeCount } = req.body;

  if (!code || !name || !head || !location) {
    return res.status(400).json({ message: "Code, name, head, and location are required." });
  }

  const department = await departmentModel.createDepartment({
    code: code.trim(),
    name: name.trim(),
    head: head.trim(),
    location: location.trim(),
    description: (description || "").trim(),
    employeeCount: 0
  });

  await notificationModel.createNotification({
    category: "System",
    message: `Department ${department.department_name} was created.`,
    priority: "Low"
  });

  return res.status(201).json(department);
}

async function updateDepartment(req, res) {
  const existing = await departmentModel.getDepartmentById(req.params.id);

  if (!existing) {
    return res.status(404).json({ message: "Department not found." });
  }

  const { code, name, head, location, description, employeeCount, status } = req.body;

  const department = await departmentModel.updateDepartment(req.params.id, {
    code: code?.trim() || existing.department_code,
    name: name?.trim() || existing.department_name,
    head: head?.trim() || existing.department_head,
    location: location?.trim() || existing.location,
    description: (description ?? existing.description ?? "").trim(),
    employeeCount: Number(employeeCount ?? existing.employee_count ?? 0),
    status: status || existing.status
  });

  await notificationModel.createNotification({
    category: "System",
    message: `Department ${department.department_name} was updated.`,
    priority: "Low"
  });

  return res.json(department);
}

async function deleteDepartment(req, res) {
  const existing = await departmentModel.getDepartmentById(req.params.id);

  if (!existing) {
    return res.status(404).json({ message: "Department not found." });
  }

  await departmentModel.softDeleteDepartment(req.params.id);
  await notificationModel.createNotification({
    category: "System",
    message: `Department ${existing.department_name} was marked inactive.`,
    priority: "Medium"
  });

  return res.json({ message: "Department deleted successfully." });
}

module.exports = {
  listDepartments,
  getDepartment,
  getSummary,
  createDepartment,
  updateDepartment,
  deleteDepartment
};
