// Validate Email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidSpaceName(name) {
  return !/^[A-Za-z\s]+$/.test(name);
}

// Validate Name
function isValidName(name) {
  const namePattern = /^[a-zA-Z\s]+$/;
  return namePattern.test(name);
}
function isValidPassword(password) {
  if (password.length < 8 || password.length > 16) {
    return { error: "Password must be between 8 and 16 characters" };
  }

  if (!/[A-Z]/.test(password)) {
    return { error: "Password must include at least one uppercase letter" };
  }

  if (!/[a-z]/.test(password)) {
    return { error: "Password must include at least one lowercase letter" };
  }

  if (!/\d/.test(password)) {
    return { error: "Password must include at least one number" };
  }

  if (!/[\W_]/.test(password)) {
    return { error: "Password must include at least one special character." };
  }
  return {};
}

module.exports = {
  isValidSpaceName,
  isValidEmail,
  isValidName,
  isValidPassword,
};
