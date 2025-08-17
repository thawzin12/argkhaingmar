const express = require("express");
const router = express.Router();
const { Category } = require("../../models");

// Show form
router.get("/category/create", (req, res) => {
  res.render("category/create", {
    title: "Create Category",
  });
});

// Handle form submit
router.post("/category/create", async (req, res) => {
  try {
    const { name } = req.body;

    // check if exists
    const exist = await Category.findOne({ where: { name } });
    if (exist) {
      req.flash("error_msg", "Category already exists!");
      return res.redirect("/category/create");
    }

    // create new
    await Category.create({ name });
    req.flash("success_msg", "Category created successfully!");
    res.redirect("/category/create");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Something went wrong!");
    res.redirect("/category/create");
  }
});

module.exports = router;
