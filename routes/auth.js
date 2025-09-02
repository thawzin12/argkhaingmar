// routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../models");
const { isValidEmail, isValidPassword } = require("../utils/validation");
const { isAuthenticated } = require("../middleware/authMiddleware");
const router = express.Router();

// Login GET
router.get("/login", (req, res) => {
  res.render("login", { data: {}, errors: {} });
});

router.get("", (req, res) => {
  res.render("login", { data: {}, errors: {} });
});

// Login POST
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  let errors = {};
  console.log(email, password);
  if (!email) {
    errors.email = "Email must be filled";
  } else if (!isValidEmail(email)) {
    errors.email = "Email is invalid";
  }

  if (!password) {
    errors.password = "Password must be filled";
  }

  if (Object.keys(errors).length > 0) {
    return res.render("login", {
      data: req.body,
      errors,
    });
  }

  const user = await db.User.findOne({ where: { email } });

  if (!user) {
    errors.email = "email is incorrect!";
    return res.render("login", {
      data: req.body,
      errors,
    });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    errors.password = "password is incorrect";
    return res.render("login", {
      data: req.body,
      errors,
    });
  }

  req.session.user = {
    uid: user.uid,
    email: user.email,
    role: user.role,
  };

  res.redirect("/dashboard");
});

router.get("/admin/createuser", (req, res) => {
  res.render("create-user", {
    data: {},
    errors: {},
  });
});
// routes/auth.js (or wherever your auth routes live)

// If you want it protected:

// Prefer POST for logout (CSRF-protected if you use CSRF)
// Logout
router.get("/logout", isAuthenticated, (req, res, next) => {
  if (!req.session) {
    return res.redirect("/login");
  }

  req.session.destroy((err) => {
    if (err) {
      console.error("Session destroy error:", err);
      return next(err);
    }

    // Clear the cookie (must use the same cookie name from session config)
    res.clearCookie("connect.sid", {
      path: "/", // or match whatever path you used in session middleware
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    return res.redirect("/login");
  });
});

module.exports = router;
