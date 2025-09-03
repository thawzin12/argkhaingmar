const express = require("express");
const router = express.Router();
const Size = require("../../models/Size");
const { Op } = require("sequelize");
const { isValidSpaceName } = require("../../utils/validation");
const { isAuthenticated } = require("../../middleware/authMiddleware");
// GET: show size creation form + list
router.get("/createsize", isAuthenticated, async (req, res) => {
  try {
    const sizes = await Size.findAll({ order: [["size_label", "ASC"]] });
    res.render("createsize", {
      title: "Create Size",
      activePage: "size",
      sizes,
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to load sizes!");
    res.render("createsize", {
      title: "Create Size",
      activePage: "size",
      sizes: [],
    });
  }
});

// POST: handle size creation
router.post("/createsize", async (req, res) => {
  try {
    const { size_label } = req.body;
    const name = size_label ? size_label.trim() : "";

    if (!name) {
      req.flash("error_msg", "Size cannot be blank!");
      return res.redirect("/createsize");
    }

    if (isValidSpaceName && !isValidSpaceName(name)) {
      req.flash(
        "error_msg",
        "Size can contain only letters, numbers, and spaces!"
      );
      return res.redirect("/createsize");
    }

    const exist = await Size.findOne({ where: { size_label: name } });
    if (exist) {
      req.flash("error_msg", "Size already exists!");
      return res.redirect("/createsize");
    }

    await Size.create({ size_label: name });
    req.flash("success_msg", `Size "${name}" created successfully!`);
    res.redirect("/createsize");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", err.message || "Something went wrong!");
    res.redirect("/createsize");
  }
});

// POST: update size
router.post("/editsize/:id", async (req, res) => {
  try {
    const { size_label } = req.body;
    const name = size_label ? size_label.trim() : "";

    if (!name) {
      req.flash("error_msg", "Size cannot be blank!");
      return res.redirect("/createsize");
    }

    const exist = await Size.findOne({
      where: { size_label: name, size_id: { [Op.ne]: req.params.id } },
    });
    if (exist) {
      req.flash("error_msg", "Another size with this name already exists!");
      return res.redirect("/createsize");
    }

    await Size.update(
      { size_label: name },
      { where: { size_id: req.params.id } }
    );
    req.flash("success_msg", "Size updated successfully!");
    res.redirect("/createsize");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", err.message || "Update failed!");
    res.redirect("/createsize");
  }
});

// POST: delete size (with secure check in modal)
router.post("/deletesize/:id", async (req, res) => {
  try {
    await Size.destroy({ where: { size_id: req.params.id } });
    req.flash("success_msg", "Size deleted successfully!");
    res.redirect("/createsize");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Delete failed!");
    res.redirect("/createsize");
  }
});

module.exports = router;
