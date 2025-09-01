// middleware/authMiddleware.js

function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect("/login");
}

function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === "admin") {
    return next();
  }
  res.status(403).send("Forbidden: Admins only");
}

function allowRoles(roles) {
  return (req, res, next) => {
    if (req.session.user && roles.includes(req.session.user.role)) {
      return next();
    }
    res.status(403).send("Forbidden: You don't have access");
  };
}

module.exports = { isAuthenticated, isAdmin, allowRoles };
