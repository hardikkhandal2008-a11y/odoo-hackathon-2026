const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
const notificationModel = require("../models/notificationModel");
const { isValidEmail, validatePassword } = require("../utils/validators");
const { buildPasswordResetEmail, sendEmail } = require("../utils/emailService");

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name
    },
    process.env.JWT_SECRET || "replace_with_a_long_random_secret",
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

async function register(req, res) {
  const { fullName, email, password } = req.body;

  if (!fullName?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ message: "Full name, email, and password are required." });
  }

  if (!isValidEmail(email.trim())) {
    return res.status(400).json({ message: "Please provide a valid email address." });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  const existingUser = await userModel.findByEmail(email.trim().toLowerCase());

  if (existingUser) {
    return res.status(409).json({ message: "An account with this email already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await userModel.createUser({
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    passwordHash
  });

  await notificationModel.createNotification({
    category: "System",
    message: `${user.full_name} created a new employee account.`,
    priority: "Low"
  });

  return res.status(201).json({
    message: "Account created successfully.",
    token: createToken(user),
    user
  });
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const user = await userModel.findByEmail(email.trim().toLowerCase());

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  if (user.status === "Inactive") {
    return res.status(403).json({ message: "Your account is inactive. Contact an administrator." });
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);

  if (!isMatch) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const safeUser = await userModel.findById(user.id);

  return res.json({
    message: "Login successful.",
    token: createToken(safeUser),
    user: safeUser
  });
}

async function me(req, res) {
  const user = await userModel.findById(req.user.id);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json(user);
}

async function logout(req, res) {
  return res.json({ message: "Logged out successfully." });
}

async function forgotPassword(req, res) {
  const { email } = req.body;

  if (!email?.trim()) {
    return res.status(400).json({ message: "Email is required." });
  }

  const user = await userModel.findByEmail(email.trim().toLowerCase());

  if (!user) {
    return res.json({
      message: "If that email exists, a reset link has been sent."
    });
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await userModel.createPasswordResetToken(user.id, resetToken, expiresAt);

  const resetUrl = `${req.protocol}://${req.get("host")}/index.html?resetToken=${resetToken}`;
  const emailPayload = buildPasswordResetEmail({
    to: user.email,
    fullName: user.full_name,
    resetToken,
    resetUrl
  });

  sendEmail(emailPayload);

  return res.json({
    message: "If that email exists, a reset link has been sent.",
    ...(process.env.NODE_ENV !== "production" && { resetToken })
  });
}

async function resetPassword(req, res) {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: "Token and new password are required." });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  const resetRecord = await userModel.findValidResetToken(token);

  if (!resetRecord) {
    return res.status(400).json({ message: "Invalid or expired reset token." });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await userModel.updatePassword(resetRecord.user_id, passwordHash);
  await userModel.markResetTokenUsed(resetRecord.id);

  return res.json({ message: "Password reset successful. You can now log in." });
}

async function listUsers(req, res) {
  const users = await userModel.listUsers();
  return res.json(users);
}

module.exports = {
  register,
  login,
  logout,
  forgotPassword,
  resetPassword,
  me,
  listUsers
};
