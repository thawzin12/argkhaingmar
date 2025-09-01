// routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../models");
const { isValidEmail, isValidPassword } = require("../utils/validation");
const router = express.Router();

// Login GET
router.get("/login", (req, res) => {
  res.render("login", { data: {}, errors: {} });
});
router.get("/", (req, res) => {
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

// Logout
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

module.exports = router;
