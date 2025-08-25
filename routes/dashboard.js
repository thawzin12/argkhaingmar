// routes/dashboard.js
const express = require("express");
const { isAuthenticated } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/dashboard", isAuthenticated, (req, res) => {
  const role = req.session.user.role;

  res.render("index", {
    user: req.session.user,
    role: role,
  });
});

module.exports = router;
