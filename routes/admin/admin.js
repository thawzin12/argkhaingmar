// routes/admin.js
const express = require("express");
const bcrypt = require("bcryptjs");
const { isAdmin } = require("../middleware/authMiddleware");
const db = require("../models");

const router = express.Router();

router.get("/admin/register", isAuthenticated, isAdmin, (req, res) => {
  res.render("admin/register", {
    title: "Register Staff",
  });
});

router.post("/admin/register", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      req.flash("error", "All fields are required");
      return res.redirect("/admin/register");
    }

    if (!["sale", "cashier"].includes(role)) {
      req.flash("error", "Role must be sale or cashier");
      return res.redirect("/admin/register");
    }

    // Check duplicate
    const exists = await User.findOne({ where: { email } });
    if (exists) {
      req.flash("error", "Email already exists");
      return res.redirect("/admin/register");
    }

    const hashed = await bcrypt.hash(password, 12);
    await User.create({ email, password: hashed, role });

    req.flash("success", `Staff created: ${email} (${role})`);
    return res.redirect("/dashboard");
  } catch (err) {
    console.error("Register staff error:", err);
    req.flash("error", "Failed to create staff");
    return res.redirect("/admin/register");
  }
});
module.exports = router;
