function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  if (!password || password.length < 6) {
    return "Password must be at least 6 characters.";
  }

  return null;
}

module.exports = {
  isValidEmail,
  validatePassword
};
