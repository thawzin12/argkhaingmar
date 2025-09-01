const express = require("express");
const router = express.Router();
const Unit = require("../../models/Unit");
const { Op } = require("sequelize");
const { isValidSpaceName } = require("../../utils/validation");

// GET: show unit creation form
router.get("/createunit", async (req, res) => {
  try {
    const units = await Unit.findAll({ order: [["unit_label", "ASC"]] });
    res.render("createunit", {
      title: "Create Unit",
      activePage: "unit",
      units,
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Failed to load units!");
    res.render("createunit", {
      title: "Create Unit",
      activePage: "unit",
      units: [],
    });
  }
});

// POST: create unit
router.post("/createunit", async (req, res) => {
  try {
    const { unit_label } = req.body;
    const name = unit_label ? unit_label.trim() : "";

    if (!name) {
      req.flash("error_msg", "Unit cannot be blank!");
      return res.redirect("/createunit");
    }
    if (isValidSpaceName && isValidSpaceName(name)) {
      req.flash("error_msg", "Unit can contain only letters and spaces!");
      return res.redirect("/createunit");
    }

    const exist = await Unit.findOne({ where: { unit_label: name } });
    if (exist) {
      req.flash("error_msg", "Unit already exists!");
      return res.redirect("/createunit");
    }

    await Unit.create({ unit_label: name });
    req.flash("success_msg", `Unit "${name}" created successfully!`);
    res.redirect("/createunit");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", err.message || "Something went wrong!");
    res.redirect("/createunit");
  }
});

// POST: update unit
router.post("/editunit/:id", async (req, res) => {
  try {
    const { unit_label } = req.body;
    const name = unit_label ? unit_label.trim() : "";

    if (!name) {
      req.flash("error_msg", "Unit cannot be blank!");
      return res.redirect("/createunit");
    }

    const exist = await Unit.findOne({
      where: { unit_label: name, unit_id: { [Op.ne]: req.params.id } },
    });
    if (exist) {
      req.flash("error_msg", "Another unit with this name already exists!");
      return res.redirect("/createunit");
    }

    await Unit.update(
      { unit_label: name },
      { where: { unit_id: req.params.id } }
    );
    req.flash("success_msg", "Unit updated successfully!");
    res.redirect("/createunit");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", err.message || "Update failed!");
    res.redirect("/createunit");
  }
});

// POST: secure delete with typed confirmation
router.post("/deleteunit/:id", async (req, res) => {
  try {
    const { confirm_name } = req.body;
    const unit = await Unit.findByPk(req.params.id);

    if (!unit) {
      req.flash("error_msg", "Unit not found!");
      return res.redirect("/createunit");
    }

    if (confirm_name.trim() !== unit.unit_label) {
      req.flash(
        "error_msg",
        "Confirmation name does not match. Deletion cancelled."
      );
      return res.redirect("/createunit");
    }

    await Unit.destroy({ where: { unit_id: req.params.id } });
    req.flash("success_msg", `Unit "${unit.unit_label}" deleted successfully!`);
    res.redirect("/createunit");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Delete failed!");
    res.redirect("/createunit");
  }
});

module.exports = router;
