const employeeModel = require("../models/employeeModel");
const departmentModel = require("../models/departmentModel");
const roleModel = require("../models/roleModel");
const notificationModel = require("../models/notificationModel");
const { isValidEmail } = require("../utils/validators");

async function listEmployees(req, res) {
  return res.json(await employeeModel.listEmployees());
}

async function getEmployee(req, res) {
  const employee = await employeeModel.getEmployeeById(req.params.id);
  if (!employee) return res.status(404).json({ message: "Employee not found." });
  return res.json(employee);
}

async function createEmployee(req, res) {
  const { code, fullName, email, phone, departmentId, roleId, userId, hiredAt } = req.body;

  if (!code?.trim() || !fullName?.trim() || !email?.trim() || !departmentId || !roleId) {
    return res.status(400).json({
      message: "Employee code, name, email, department, and role are required."
    });
  }

  if (!isValidEmail(email.trim())) {
    return res.status(400).json({ message: "Please provide a valid email address." });
  }

  const department = await departmentModel.getDepartmentById(departmentId);
  const role = await roleModel.getRoleById(roleId);

  if (!department) return res.status(400).json({ message: "Invalid department selected." });
  if (!role) return res.status(400).json({ message: "Invalid role selected." });

  const employee = await employeeModel.createEmployee({
    code: code.trim(),
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    phone: phone?.trim(),
    departmentId,
    roleId,
    userId,
    hiredAt
  });

  await notificationModel.createNotification({
    category: "System",
    message: `Employee ${employee.full_name} was added to ${employee.department_name}.`,
    priority: "Low"
  });

  return res.status(201).json(employee);
}

async function updateEmployee(req, res) {
  const existing = await employeeModel.getEmployeeById(req.params.id);
  if (!existing) return res.status(404).json({ message: "Employee not found." });

  const employee = await employeeModel.updateEmployee(req.params.id, {
    code: req.body.code?.trim() || existing.employee_code,
    fullName: req.body.fullName?.trim() || existing.full_name,
    email: req.body.email?.trim().toLowerCase() || existing.email,
    phone: req.body.phone?.trim() ?? existing.phone,
    departmentId: req.body.departmentId || existing.department_id,
    roleId: req.body.roleId || existing.role_id,
    userId: req.body.userId ?? existing.user_id,
    status: req.body.status || existing.status,
    hiredAt: req.body.hiredAt ?? existing.hired_at
  });

  return res.json(employee);
}

async function deleteEmployee(req, res) {
  const existing = await employeeModel.getEmployeeById(req.params.id);
  if (!existing) return res.status(404).json({ message: "Employee not found." });

  await employeeModel.softDeleteEmployee(req.params.id);
  return res.json({ message: "Employee deleted successfully." });
}

module.exports = {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee
};
